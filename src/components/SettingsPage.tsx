import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '../i18n'
import { useTrainer } from '../store/trainerStore'
import { SOUND_KINDS, playSound } from '../ui/sound'
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
        <div className="setting">
          <span>{t('settings.middleName')}</span>
          <div className="lang" role="group" aria-label={t('settings.middleName')}>
            {(['MP', 'HJ'] as const).map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={settings.middleName === name}
                onClick={() => update({ middleName: name })}
              >
                {name}
              </button>
            ))}
          </div>
          <small>{t('settings.middleNameHint')}</small>
        </div>
        <label className="setting">
          <span>{t('settings.dailyGoal')}</span>
          {intInput('dailyGoal', 1, 5000)}
        </label>
      </section>

      <section>
        <h2>{t('settings.training')}</h2>
        <div className="setting">
          <span>{t('settings.mixedMode')}</span>
          <div className="lang" role="group" aria-label={t('settings.mixedMode')}>
            {(['threshold', 'rng'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.mixedMode === mode}
                onClick={() => update({ mixedMode: mode })}
              >
                {t(`settings.mixedModes.${mode}`)}
              </button>
            ))}
          </div>
          <small>{t(`settings.mixedModeHint.${settings.mixedMode}`)}</small>
        </div>
        <label className="setting setting-inline">
          <input type="checkbox" checked={settings.sizeInput} onChange={(e) => update({ sizeInput: e.target.checked })} />
          <span>{t('settings.sizeInput')}</span>
        </label>
        {settings.sizeInput && (
          <label className="setting">
            <span>{t('settings.sizeTolerance')}</span>
            <NumberField value={settings.sizeTolerance} min={0} max={5} step={0.5} onChange={(v) => update({ sizeTolerance: v })} />
            <small>{t('settings.sizeToleranceHint')}</small>
          </label>
        )}
        {settings.mixedMode === 'threshold' && (
          <Percent
            label={t('settings.threshold')}
            hint={t('settings.thresholdHint')}
            value={settings.threshold}
            min={5}
            max={100}
            step={5}
            onChange={(threshold) => update({ threshold })}
          />
        )}
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
        <p className="setting-hint">{t('settings.soundKinds')}</p>
        <div className="sound-kinds">
          {SOUND_KINDS.map((k) => (
            <div key={k} className="sound-kind">
              <label className="setting-inline">
                <input
                  type="checkbox"
                  checked={settings.soundKinds[k]}
                  disabled={!settings.sound}
                  onChange={(e) => update({ soundKinds: { ...settings.soundKinds, [k]: e.target.checked } })}
                />
                <span>{t(`settings.sounds.${k}`)}</span>
              </label>
              <button
                type="button"
                aria-label={t('settings.preview', { name: t(`settings.sounds.${k}`) })}
                disabled={!settings.sound}
                onClick={() => playSound(k, settings.volume)}
              >
                ▶
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
