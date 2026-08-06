import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, ArrowLeft, Package, Sparkles, AlertTriangle } from 'lucide-react';

interface ConfirmedOrder {
  id: string;
  customer_name: string;
  items: { name: string; quantity: number; weight: string }[];
  total: number;
  status: string;
  created_at: string;
}

interface SuccessPageProps {
  onReturnHome: () => void;
  onOrderConfirmed?: () => void;
}

type LoadState = 'checking' | 'confirmed' | 'pending' | 'not_found';

export const SuccessPage: React.FC<SuccessPageProps> = ({ onReturnHome, onOrderConfirmed }) => {
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [state, setState] = useState<LoadState>('checking');
  const sessionId = new URLSearchParams(window.location.search).get('session_id');

  useEffect(() => {
    // Cart is now cleared based on real, server-confirmed payment status —
    // not simply because the browser landed on /success.
    if (!sessionId) {
      setState('not_found');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15; // ~30s: gives the Stripe webhook time to land

    const poll = async () => {
      try {
        const res = await fetch(`/.netlify/functions/order-status?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;

        if (res.status === 200) {
          const data = await res.json();
          setOrder(data.order);
          setState('confirmed');
          onOrderConfirmed?.();
          localStorage.removeItem('miel_epices_pending_cart');
          localStorage.removeItem('miel_epices_pending_shipping');
          return;
        }

        if (res.status === 202) {
          attempts += 1;
          if (attempts >= maxAttempts) {
            setState('pending');
            return;
          }
          setTimeout(poll, 2000);
          return;
        }

        setState('not_found');
      } catch {
        if (!cancelled) setState('not_found');
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, onOrderConfirmed]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="panel max-w-2xl w-full p-8 md:p-12 rounded-3xl text-center relative overflow-hidden">
        {(state === 'checking' || state === 'pending') && (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-[#B9822E] flex items-center justify-center mx-auto mb-6 text-[#B9822E]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B9822E]"></div>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-3">
              Vérification de votre paiement...
            </h1>
            <p className="text-sm text-[#6B6259] font-light max-w-md mx-auto mb-8 leading-relaxed">
              {state === 'pending'
                ? "La confirmation prend plus de temps que prévu. Si le paiement a bien été effectué, vous recevrez un e-mail de confirmation sous peu."
                : "Nous confirmons votre transaction directement auprès de Stripe, merci de patienter quelques secondes."}
            </p>
          </>
        )}

        {state === 'not_found' && (
          <>
            <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-3">
              Commande introuvable
            </h1>
            <p className="text-sm text-[#6B6259] font-light max-w-md mx-auto mb-8 leading-relaxed">
              Nous n'avons pas pu retrouver de commande associée à cette session. Si vous pensez que le paiement a été prélevé, contactez-nous avec l'e-mail utilisé lors de l'achat.
            </p>
          </>
        )}

        {state === 'confirmed' && order && (
          <>
            <div className="w-20 h-20 rounded-full border-2 border-[#B9822E] flex items-center justify-center mx-auto mb-6 text-[#8C5F1E]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1E2C4]/50 border border-[#B9822E]/40 text-[#8C5F1E] text-xs font-semibold uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Paiement Confirmé avec Succès</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
              Merci pour votre commande !
            </h1>

            <p className="text-sm text-[#6B6259] font-light max-w-md mx-auto mb-8 leading-relaxed">
              Votre paiement via Stripe Checkout a été validé avec succès. Nos artisans-pâtissiers préparent déjà votre écrin de gourmandises traditionnelles.
            </p>

            <div className="border border-[#E4DDD0] rounded-2xl p-6 text-left mb-8 space-y-4">
              <div className="flex justify-between items-center border-b border-[#E4DDD0] pb-3">
                <div>
                  <span className="text-[10px] text-[#6B6259] uppercase tracking-wider block">Numéro de Commande</span>
                  <span className="font-serif font-bold text-lg">{order.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6B6259] uppercase tracking-wider block">Date</span>
                  <span className="text-xs font-medium">
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#6B6259] uppercase tracking-wider block mb-2">Pâtisseries Commandées</span>
                <div className="space-y-2">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span>{it.quantity}x {it.name} ({it.weight})</span>
                      <span className="font-semibold text-[#8C5F1E]">Inclus</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#E4DDD0] pt-3 flex justify-between items-center text-sm">
                <span className="text-[#6B6259] font-medium">Montant Total Réglé :</span>
                <span className="font-serif font-bold text-xl">{Number(order.total).toFixed(2)} €</span>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-8 py-3.5 btn-primary text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continuer mes achats</span>
          </button>
        </div>
      </div>
    </div>
  );
};
