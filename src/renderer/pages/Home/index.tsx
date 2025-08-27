import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.scss';
import { usePilesContext } from '../../context/PilesContext';
import { useAuth } from '../../context/AuthContext';
import DeletePile from './DeletePile';
import { TrashIcon } from 'renderer/icons';
import Logo from './logo';
import OpenPileFolder from './OpenPileFolder';

const quotes = [
  'One moment at a time',
  'Scribe your soul',
  'Reflections reimagined',
  'Look back, leap forward!',
  'Tales of you - for every human is an epic in progress',
  'Your thoughtopia awaits',
  'The quintessence of quiet contemplation',
  'Journal jamboree',
];

export default function Home() {
  const {
    piles,
    cloudPiles,
    allPiles,
    syncEnabled,
    loading: pilesLoading,
    createCloudPile,
    deleteCloudPile,
    isAuthenticated: pilesAuthenticated,
  } = usePilesContext();
  const { user, profile, signOut, isAuthenticated, loading } = useAuth();
  const [folderExists, setFolderExists] = useState(false);
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(quote);
  }, []);

  const renderPiles = () => {
    const displayPiles = isAuthenticated ? allPiles : piles;

    if (displayPiles.length == 0) {
      return (
        <div className={styles.noPiles}>
          {isAuthenticated
            ? 'No piles found. Create a local pile or sync your journals to the cloud.'
            : 'No existing piles. Start by creating a new pile.'}
        </div>
      );
    }

    return displayPiles.map((pile: any) => {
      const isCloudPile = pile.isCloudPile || pile.type === 'cloud';
      const pileKey = isCloudPile ? pile.id : pile.path;

      return (
        <div
          className={`${pile.theme && `${pile.theme}Theme`} ${styles.pile} ${isCloudPile ? styles.cloudPile : ''}`}
          key={pileKey}
        >
          <div className={styles.left}>
            <div className={styles.name}>
              {pile.name}
              {isCloudPile && <span className={styles.cloudBadge}>☁</span>}
            </div>
            {isCloudPile && pile.description && (
              <div className={styles.description}>{pile.description}</div>
            )}
            {!isCloudPile && <div className={styles.src}>{pile.path}</div>}
          </div>
          <div className={styles.right}>
            {!isCloudPile ? (
              <>
                <DeletePile pile={pile} />
                <OpenPileFolder pile={pile} />
                <Link to={`/pile/${pile.name}`} className={styles.button}>
                  Open
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        `Delete cloud pile "${pile.name}"? This cannot be undone.`,
                      )
                    ) {
                      await deleteCloudPile(pile.id);
                    }
                  }}
                  className={styles.iconButton}
                  title="Delete cloud pile"
                >
                  <TrashIcon className={styles.icon} />
                </button>
                <Link to={`/pile/cloud/${pile.id}`} className={styles.button}>
                  Open
                </Link>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={styles.frame}>
      <div className={styles.wrapper}>
        {/* Authentication section - positioned absolutely */}
        <div className={styles.authSection}>
          {loading ? (
            <div className={styles.authStatus}>Loading...</div>
          ) : isAuthenticated ? (
            <div className={styles.userInfo}>
              <span className={styles.welcomeText}>
                Welcome, {profile?.display_name || user?.email}
              </span>
              <div className={styles.userActions}>
                <Link to="/profile" className={styles.button}>
                  Profile
                </Link>
                <button onClick={signOut} className={styles.button}>
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/auth" className={styles.button}>
              Sign In / Sign Up
            </Link>
          )}
        </div>

        {/* Main content - centered */}
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.holder}>
              <div className={styles.iconHolder}>
                <Logo className={styles.icon} />
              </div>
              <div className={styles.name}>Pile</div>
            </div>
          </div>

          <div className={styles.createSection}>
            <Link to="/new-pile" className={styles.button}>
              Create a local pile →
            </Link>

            {isAuthenticated && (
              <button
                className={styles.button}
                onClick={async () => {
                  const name = prompt('Enter pile name:');
                  if (name?.trim()) {
                    const description =
                      prompt('Enter description (optional):') || '';
                    await createCloudPile(name.trim(), description.trim());
                  }
                }}
              >
                Create a cloud pile ☁
              </button>
            )}
          </div>

          <div className={styles.or}>
            or open an existing pile
          </div>

          <div className={styles.piles}>{renderPiles()}</div>

          <div className={styles.footer}>
            <a href="https://udara.io/pile" target="_blank" rel="noreferrer">
              <div className={styles.unms} />
              {quote}
            </a>

            <div className={styles.nav}>
              <Link to="/license" className={styles.link}>
                License
              </Link>
              <a
                href="https://udara.io/pile"
                target="_blank"
                className={styles.link}
                rel="noreferrer"
              >
                Tutorial
              </a>
              <a
                href="https://github.com/udarajay/pile"
                target="_blank"
                className={styles.link}
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
