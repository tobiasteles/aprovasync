'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  pendingText = 'Aguarde…',
  className = 'btn btn-primary',
  formAction,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} formAction={formAction}>
      {pending ? pendingText : children}
    </button>
  );
}
