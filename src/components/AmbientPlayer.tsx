import { useAmbientAudio, AMBIENT_SOUNDS } from '../hooks/useAmbientAudio'
import styles from './AmbientPlayer.module.css'

export function AmbientPlayer() {
  const { soundType, volume, changeSound, changeVolume } = useAmbientAudio()

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <span className={styles.icon}>🎵</span>
        氛围音乐
      </h3>

      {/* Sound Type Selector */}
      <div className={styles.soundGrid}>
        {AMBIENT_SOUNDS.map((sound) => (
          <button
            key={sound.id}
            className={`${styles.soundBtn} ${soundType === sound.id ? styles.active : ''}`}
            onClick={() => changeSound(sound.id)}
            aria-pressed={soundType === sound.id}
          >
            <span className={styles.soundIcon}>{sound.icon}</span>
            <span className={styles.soundLabel}>{sound.label}</span>
          </button>
        ))}
      </div>

      {/* Volume Control */}
      {soundType !== 'none' && (
        <div className={styles.volumeControl}>
          <label className={styles.volumeLabel}>
            <span>音量</span>
            <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className={styles.volumeSlider}
            aria-label="音量调节"
          />
        </div>
      )}

      {/* Now Playing Indicator */}
      {soundType !== 'none' && (
        <div className={styles.nowPlaying}>
          <span className={styles.wave}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className={styles.nowPlayingText}>
            正在播放: {AMBIENT_SOUNDS.find(s => s.id === soundType)?.label}
          </span>
        </div>
      )}
    </div>
  )
}
