-- Create trigger function to auto-sync is_available for women
CREATE OR REPLACE FUNCTION public.sync_women_is_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update is_available based on current counts vs max limits
  NEW.is_available := (
    NEW.current_chat_count < NEW.max_concurrent_chats 
    AND NEW.current_call_count < NEW.max_concurrent_calls
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on women_availability for INSERT and UPDATE
DROP TRIGGER IF EXISTS sync_is_available_on_change ON women_availability;
CREATE TRIGGER sync_is_available_on_change
  BEFORE INSERT OR UPDATE OF current_chat_count, current_call_count, max_concurrent_chats, max_concurrent_calls
  ON women_availability
  FOR EACH ROW
  EXECUTE FUNCTION sync_women_is_available();

-- Also update when user comes online - set is_available based on counts
CREATE OR REPLACE FUNCTION public.sync_availability_on_online()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When user goes online, update their availability
  IF NEW.is_online = true AND (OLD.is_online = false OR OLD.is_online IS NULL) THEN
    UPDATE women_availability
    SET is_available = (current_chat_count < max_concurrent_chats AND current_call_count < max_concurrent_calls)
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- When user goes offline, mark as unavailable
  IF NEW.is_online = false AND OLD.is_online = true THEN
    UPDATE women_availability
    SET is_available = false
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_availability_on_status_change ON user_status;
CREATE TRIGGER sync_availability_on_status_change
  AFTER UPDATE OF is_online
  ON user_status
  FOR EACH ROW
  EXECUTE FUNCTION sync_availability_on_online();