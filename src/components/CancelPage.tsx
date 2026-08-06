import React, { useEffect } from 'react';
import { XCircle, ShoppingBag, ArrowLeft, RefreshCw } from 'lucide-react';

interface CancelPageProps {
  onReturnHome: () => void;
  onOpenCart?: () => void;
}

export const CancelPage: React.FC<CancelPageProps> = ({ onReturnHome, onOpenCart }) => {
  useEffect(() => {
    // Keep pending cart intact so user can retry easily
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="panel max-w-lg w-full p-8 md:p-12 rounded-3xl text-center relative overflow-hidden border-red-200">
        <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
          <XCircle className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-widest mb-3">
          Paiement Non Finalisé
        </span>

        <h1 className="font-serif text-3xl font-bold mb-3">
          Commande Interrompue
        </h1>

        <p className="text-sm text-[#6B6259] font-light max-w-sm mx-auto mb-8 leading-relaxed">
          Le processus de paiement Stripe a été annulé. Aucun débit n'a été effectué sur votre compte bancaire. Votre panier reste conservé.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onOpenCart && (
            <button
              onClick={() => {
                onReturnHome();
                onOpenCart();
              }}
              className="w-full sm:w-auto px-6 py-3.5 btn-primary text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer le paiement</span>
            </button>
          )}

          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-6 py-3.5 border border-[#E4DDD0] hover:border-[#1C1712] text-xs uppercase tracking-widest font-semibold rounded-full text-[#1C1712] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la boutique</span>
          </button>
        </div>
      </div>
    </div>
  );
};
