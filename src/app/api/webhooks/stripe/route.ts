import type Stripe from 'stripe';
import { env } from '@/lib/env';
import { getStripe } from '@/server/billing/stripe';
import { recordStripePassPayment, syncStripeSubscription } from '@/server/services/billing.service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text(); // corpo CRU: necessário para validar a assinatura
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', env('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return new Response('Assinatura inválida', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'payment') {
          await recordStripePassPayment(session);
        } else if (session.mode === 'subscription' && session.subscription) {
          const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await syncStripeSubscription(await stripe.subscriptions.retrieve(id));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncStripeSubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('[webhook stripe]', event.type, e);
    return new Response('Erro ao processar', { status: 500 }); // Stripe reenvia
  }
  return Response.json({ received: true });
}
