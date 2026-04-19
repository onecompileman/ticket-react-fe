import 'animate.css';
import googleIcon from '../assets/icons/google.svg';
import './LoginPage.css';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { authCognitoService } from '../api/services/AuthCognitoService';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/services/AuthService';
import { useUserStore } from '../shared/stores/userStore';
import { useLoadingStore } from '../shared/stores/loadingStore';

const PENDING_INVITE_CODE_KEY = 'ticket_pending_invite_code';

const features = [
  {
    title: 'Shared Boards',
    description: 'See personal and team workspaces without switching tools.',
  },
  {
    title: 'Fast Triage',
    description: 'Move tickets through backlog, review, and done with clarity.',
  },
  {
    title: 'Focused Access',
    description:
      'Google-only entry keeps onboarding simple for internal teams.',
  },
];

const stats = [
  {
    title: 'One-step access',
    description: 'Enter the board area directly after Google auth.',
  },
  {
    title: 'Workspace-ready',
    description: 'Designed to route into your Ticket home experience.',
  },
];

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();
  const { showLoading, hideLoading } = useLoadingStore();

  const fetchToken = async (code) => {
    showLoading();
    const tokenResponse = await authCognitoService.getLoginToken(code);

    localStorage.setItem('access_token', tokenResponse.access_token);
    localStorage.setItem('id_token', tokenResponse.id_token);

    const activeUser = await authService.getActiveUser();
    setUser(activeUser);
    hideLoading();
    navigate('/home', { replace: true });
  };

  useEffect(() => {
    const inviteCode = searchParams.get('inviteCode');
    if (inviteCode) {
      localStorage.setItem(PENDING_INVITE_CODE_KEY, inviteCode);
    }

    if (user) {
      navigate('/home', { replace: true });
    }

    const code = searchParams.get('code');
    if (code) {
      fetchToken(code);
    }
  }, [searchParams, user]);

  return (
    <main className="login-page">
      <div className="login-shell">
        <section
          className="login-showcase animate__animated animate__fadeInLeft animate__faster"
          aria-label="Ticket introduction"
        >
          <div className="brand-row animate__animated animate__fadeInDown">
            <span className="brand-mark">T</span>
            <span className="brand-name">Ticket</span>
          </div>

          <div className="hero-copy animate__animated animate__fadeInUp">
            <span className="eyebrow">
              Boards, tickets, and team flow in one place
            </span>
            <h1>Sign in once. Pick up every task fast.</h1>
            <p>
              Ticket keeps your boards, assignments, and sprint work organized
              behind one clean Google sign-in. No alternate auth paths, no extra
              friction.
            </p>
          </div>

          <div className="feature-grid animate__animated animate__fadeInUp animate__delay-1s">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="feature-card animate__animated animate__fadeInUp animate__delay-1s"
              >
                <strong>{feature.title}</strong>
                <span>{feature.description}</span>
              </article>
            ))}
          </div>
        </section>

        <section
          className="login-panel animate__animated animate__fadeInRight animate__faster"
          aria-label="Sign in form"
        >
          <div className="login-card">
            <div className="animate__animated animate__fadeInDown">
              <h2>Welcome back</h2>
              <p>
                Continue to Ticket with your Google account. This mockup
                intentionally exposes only one authentication method.
              </p>
            </div>

            <div className="auth-box animate__animated animate__zoomIn animate__delay-1s">
              <button
                type="button"
                className="google-button animate__animated animate__pulse animate__delay-1s"
                aria-label="Sign in via Google"
                onClick={() => authCognitoService.loginViaGoogle()}
              >
                <img
                  className="google-icon"
                  src={googleIcon}
                  alt=""
                  aria-hidden="true"
                />
                <span>Sign In via Google</span>
              </button>

              <div className="auth-note">
                Access is limited to Google authentication for this screen.
                Email-password, SSO variants, and guest login are intentionally
                omitted.
              </div>

              <div className="mini-stats">
                {stats.map((stat) => (
                  <div key={stat.title} className="mini-stat">
                    <strong>{stat.title}</strong>
                    <span>{stat.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="support-copy animate__animated animate__fadeInUp animate__delay-1s">
              Need a different identity provider later? Add it in a separate
              version instead of mixing flows into this mockup.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
