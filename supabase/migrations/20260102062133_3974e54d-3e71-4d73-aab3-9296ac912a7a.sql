-- Add missing gift options for 1-to-1 private calls
INSERT INTO public.gifts (name, emoji, price, category, description, is_active, sort_order)
VALUES 
  ('Diamond', '💎', 400, 'premium', 'A sparkling diamond gift', true, 8),
  ('Luxury Car', '🚗', 600, 'premium', 'A luxury car gift', true, 9),
  ('Yacht', '🛥️', 800, 'premium', 'A beautiful yacht gift', true, 10),
  ('Castle', '🏰', 1000, 'premium', 'A majestic castle gift', true, 11)
ON CONFLICT DO NOTHING;