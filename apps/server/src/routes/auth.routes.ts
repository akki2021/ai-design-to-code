import { Router, Request, Response } from 'express';

const router = Router();

const FIGMA_AUTH_URL = 'https://www.figma.com/oauth';
const FIGMA_TOKEN_URL = 'https://api.figma.com/v1/oauth/token';

/**
 * GET /auth/figma
 * Redirect the user to Figma's OAuth consent screen
 */
router.get('/figma', (req: Request, res: Response) => {
    const clientId = process.env.FIGMA_CLIENT_ID;
    const redirectUri = 'http://localhost:4000/auth/figma/callback';
    const state = Math.random().toString(36).substring(2, 15);

    // Store state in session to verify later (CSRF protection)
    (req.session as any).oauthState = state;

    const params = new URLSearchParams({
        client_id: clientId || '',
        redirect_uri: redirectUri,
        scope: 'file_content:read',
        state,
        response_type: 'code',
    });

    res.redirect(`${FIGMA_AUTH_URL}?${params.toString()}`);
});

/**
 * GET /auth/figma/callback
 * Figma redirects here after user grants access. Exchange code for access_token.
 */
router.get('/figma/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Verify state for CSRF protection
    if (!state || state !== (req.session as any).oauthState) {
        res.redirect(`${frontendUrl}?auth_error=invalid_state`);
        return;
    }

    if (!code) {
        res.redirect(`${frontendUrl}?auth_error=no_code`);
        return;
    }

    try {
        const clientId = process.env.FIGMA_CLIENT_ID;
        const clientSecret = process.env.FIGMA_CLIENT_SECRET;
        const redirectUri = 'http://localhost:4000/auth/figma/callback';

        const tokenResponse = await fetch(FIGMA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId || '',
                client_secret: clientSecret || '',
                redirect_uri: redirectUri,
                code: code as string,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            console.error('[OAuth] Token exchange failed:', errText);
            res.redirect(`${frontendUrl}?auth_error=token_exchange_failed`);
            return;
        }

        const tokenData = await tokenResponse.json();

        // Store access token and user info in session
        (req.session as any).figmaAccessToken = tokenData.access_token;
        (req.session as any).figmaRefreshToken = tokenData.refresh_token;
        (req.session as any).figmaUserId = tokenData.user_id;
        (req.session as any).figmaExpiresIn = tokenData.expires_in;

        // Fetch user info for display
        try {
            const meResponse = await fetch('https://api.figma.com/v1/me', {
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
            });
            if (meResponse.ok) {
                const meData = await meResponse.json();
                (req.session as any).figmaUserName = meData.handle || meData.email;
                (req.session as any).figmaUserImg = meData.img_url;
            }
        } catch {
            // Non-critical — user info is optional
        }

        // Redirect back to the frontend
        res.redirect(frontendUrl);
    } catch (err: any) {
        console.error('[OAuth] Error:', err.message);
        res.redirect(`${frontendUrl}?auth_error=server_error`);
    }
});

/**
 * GET /auth/me
 * Return current auth status
 */
router.get('/me', (req: Request, res: Response) => {
    const session = req.session as any;

    if (session.figmaAccessToken) {
        res.json({
            authenticated: true,
            user: {
                name: session.figmaUserName || 'Figma User',
                img: session.figmaUserImg || null,
            },
        });
    } else {
        res.json({ authenticated: false });
    }
});

/**
 * POST /auth/logout
 * Destroy session
 */
router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Failed to log out' });
            return;
        }
        res.json({ success: true });
    });
});

export default router;
