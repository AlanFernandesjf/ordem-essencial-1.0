
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'none';

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>('none');
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: sub, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !sub) {
        setStatus('none');
        setLoading(false);
        return;
      }

      setStatus(sub.status as SubscriptionStatus);

      // Calcular dias restantes (se trial ou active)
      if (sub.current_period_end) {
        const end = new Date(sub.current_period_end);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        setDaysRemaining(days);
      }

    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      setStatus('none');
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, daysRemaining, checkSubscription };
}
