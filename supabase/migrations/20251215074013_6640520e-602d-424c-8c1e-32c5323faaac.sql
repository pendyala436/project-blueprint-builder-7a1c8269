-- Insert profile for user pendyala436@gmail.com with phone number
INSERT INTO profiles (user_id, phone, email, updated_at)
VALUES ('c5da801c-d7f9-4ab3-ae3c-34aaa7fde7f5', '+918790348110', 'pendyala436@gmail.com', now())
ON CONFLICT (user_id) DO UPDATE SET phone = '+918790348110', updated_at = now();