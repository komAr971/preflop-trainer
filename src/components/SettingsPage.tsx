import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '../i18n'
import { useTrainer } from '../store/trainerStore'
import { playSound } from '../ui/sound'
import { NumberField } from './NumberField'

function Percent({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="setting">
      <span>{label}</span>
      <span className="setting-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
        />
        <output>{Math.round(value * 100)}%</output>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const settings = useTrainer((s) => s.settings)
  const update = useTrainer((s) => s.updateSettings)

  const intInput = (key: 'dailyGoal' | 'learnedWindow', min: number, max: number) => (
    <NumberField integer value={settings[key]} min={min} max={max} onChange={(v) => update({ [key]: v })} />
  )

  return (
    <main className="settings">
      <section>
        <h2>{t('settings.general')}</h2>
        <div className="setting">
          <span>{t('app.language')}</span>
          <div className="lang" role="group" aria-label={t('app.language')}>
            {LANGUAGES.map((lang) => (
              <button key={lang} type="button" aria-pressed={i18n.language === lang} onClick={() => setLanguage(lang)}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <label className="setting">
          <span>{t('settings.dailyGoal')}</span>
          {intInput('dailyGoal', 1, 5000)}
        </label>
      </section>

      <section>
        <h2>{t('settings.training')}</h2>
        <Percent
          label={t('settings.threshold')}
          hint={t('settings.thresholdHint')}
          value={settings.threshold}
          min={5}
          max={100}
          step={5}
          onChange={(threshold) => update({ threshold })}
        />
        <Percent
          label={t('settings.borderline')}
          hint={t('settings.borderlineHint')}
          value={settings.borderlineShare}
          min={0}
          max={100}
          step={5}
          onChange={(borderlineShare) => update({ borderlineShare })}
        />
        <Percent
          label={t('settings.learnedThreshold')}
          value={settings.learnedThreshold}
          min={50}
          max={100}
          step={1}
          onChange={(learnedThreshold) => update({ learnedThreshold })}
        />
        <label className="setting">
          <span>{t('settings.learnedWindow')}</span>
          {intInput('learnedWindow', 10, 2000)}
        </label>
      </section>

      <section>
        <h2>{t('settings.sound')}</h2>
        <label className="setting setting-inline">
          <input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} />
          <span>{t('settings.soundOn')}</span>
        </label>
        <Percent
          label={t('settings.volume')}
          value={settings.volume}
          min={0}
          max={100}
          step={5}
          onChange={(volume) => update({ volume })}
        />
        <div className="sound-test">
          {(['deal', 'chip', 'correct', 'wrong'] as const).map((k) => (
            <button key={k} type="button" disabled={!settings.sound} onClick={() => playSound(k, settings.volume)}>
              ▶ {t(`settings.sounds.${k}`)}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
