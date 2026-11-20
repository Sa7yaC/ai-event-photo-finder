# Engineering

- For social/OAuth sign-in, prefers using a managed provider (Supabase Auth, configured per the official Supabase + Google provider docs) over hand-rolling the provider integration (Google Identity Services button + manual ID-token verification); the sign-in flow should route through that service. Confidence: 0.65
