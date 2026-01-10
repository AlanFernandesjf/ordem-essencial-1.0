import { supabase } from "@/lib/supabase";

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  subscriptionId?: string;
  message?: string;
  error?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
}

export const createSubscription = async (
    planId: string, 
    email: string,
    billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO',
    creditCard?: { 
        holderName: string; 
        number: string; 
        expiryMonth: string; 
        expiryYear: string; 
        ccv: string; 
    },
    installments: number = 1
) => {
  try {
    console.log(`Iniciando pagamento: Plano=${planId}, Método=${billingType}, Parcelas=${installments}`);
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: { 
                plan: planId, 
                email, 
                billingType,
                creditCard: creditCard?.number,
                holderName: creditCard?.holderName,
                expiryMonth: creditCard?.expiryMonth,
                expiryYear: creditCard?.expiryYear,
                ccv: creditCard?.ccv,
                installments 
            }
        });

    if (error) {
        console.error("Supabase Invoke Error Full:", error);
        throw error;
    }
    
    // Agora que a função retorna 200 mesmo em erro lógico, verificamos o body
    if (data && !data.success) {
        console.error("Erro retornado pelo backend:", data);
        throw new Error(data.error || 'Erro desconhecido retornado pelo servidor.');
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao processar pagamento:', error);
    
    let errorMessage = error.message;
    if (errorMessage === 'Failed to fetch') {
        errorMessage = 'Não foi possível conectar ao servidor de pagamentos. A função pode estar indisponível ou bloqueada (Verifique CORS/AdBlock).';
    } else if (errorMessage.includes('non-2xx')) {
        // Se ainda recebermos non-2xx, é um erro realmente fatal (crash do Deno antes do try/catch ou timeout)
        errorMessage = 'Erro crítico de comunicação com o servidor (500/504).';
    }

    throw new Error(errorMessage);
  }
};
