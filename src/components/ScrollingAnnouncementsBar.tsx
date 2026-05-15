import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  message: string;
  target_group: 'all' | 'men' | 'women';
}

interface Props {
  /** 'men' | 'women' — used to filter target_group */
  gender?: string;
  className?: string;
}

/**
 * Marquee-style ticker showing active scrolling announcements.
 * New announcements append to the end of the scroll automatically.
 */
export const ScrollingAnnouncementsBar = ({ gender, className }: Props) => {
  const [items, setItems] = useState<Announcement[]>([]);

  const load = async () => {
    const g = (gender || '').toLowerCase();
    const targets = g === 'female' || g === 'women' ? ['all', 'women']
      : g === 'male' || g === 'men' ? ['all', 'men']
      : ['all', 'men', 'women'];

    const { data } = await supabase
      .from('scrolling_announcements')
      .select('id, message, target_group')
      .eq('is_active', true)
      .in('target_group', targets)
      .order('created_at', { ascending: true });

    setItems((data as Announcement[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('scrolling-announcements-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scrolling_announcements' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  if (items.length === 0) return null;

  // Concatenate all announcements separated by bullets, duplicate for seamless scroll
  const text = items.map(i => i.message).join('   •   ');

  return (
    <div className={cn(
      'w-full overflow-hidden bg-primary/10 border-y border-primary/30 flex items-center gap-2 py-1.5 px-2',
      className
    )}>
      <Megaphone className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 overflow-hidden whitespace-nowrap relative">
        <div className="inline-block animate-marquee whitespace-nowrap text-xs sm:text-sm text-foreground font-medium">
          {text}   •   {text}   •&nbsp;
        </div>
      </div>
    </div>
  );
};

export default ScrollingAnnouncementsBar;
