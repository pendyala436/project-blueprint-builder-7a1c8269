package app.lovable.meowmeow.twa;

import android.net.Uri;
import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;
import com.google.androidbrowserhelper.trusted.LauncherActivity;
import com.google.androidbrowserhelper.trusted.LauncherActivityMetadata;

/**
 * Entry point of the TWA. The base class handles:
 *  - Verifying the digital asset link with the web origin
 *  - Launching Chrome in trusted-web mode pointed at DEFAULT_URL
 *  - Showing the splash screen during cold start
 *
 * No business logic lives here. All UI is rendered by the existing
 * React app at https://meowmeow123.lovable.app.
 */
public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected Uri getLaunchingUrl() {
        // Append a query parameter so analytics can distinguish TWA traffic
        Uri base = super.getLaunchingUrl();
        return base.buildUpon().appendQueryParameter("source", "twa").build();
    }
}
