/**
 * StylePanel - Right panel for caption styling
 *
 * Provides visual previews for caption styles (Simple, Bold, Karaoke,
 * Glitch, Highlighter), position, font size, text color picker, and
 * background opacity slider.
 */

import type { CaptionStyle, CaptionPosition, FontSize } from './VideoPlayer'

const STYLES: { value: CaptionStyle; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'bold', label: 'Bold' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'glitch', label: 'Glitch' },
  { value: 'highlighter', label: 'Highlighter' },
]

const POSITIONS: { value: CaptionPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
]

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

const SAMPLE = 'Sample text'

interface StylePanelProps {
  style: CaptionStyle
  position: CaptionPosition
  fontSize: FontSize
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
  onStyleChange: (style: CaptionStyle) => void
  onPositionChange: (position: CaptionPosition) => void
  onFontSizeChange: (fontSize: FontSize) => void
  onTextColorChange: (color: string) => void
  onBackgroundColorChange: (color: string) => void
  onBackgroundOpacityChange: (opacity: number) => void
}

export default function StylePanel({
  style,
  position,
  fontSize,
  textColor,
  backgroundColor,
  backgroundOpacity,
  onStyleChange,
  onPositionChange,
  onFontSizeChange,
  onTextColorChange,
  onBackgroundColorChange,
  onBackgroundOpacityChange,
}: StylePanelProps) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Subtitle style
      </h3>

      {/* Style selector with previews */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Style</label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStyleChange(s.value)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-left transition-all ${
                style === s.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex h-8 w-full items-center justify-center rounded bg-black/50">
                <StylePreview style={s.value} sample={SAMPLE} />
              </div>
              <span className="text-xs text-zinc-400">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Position</label>
        <div className="flex gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPositionChange(p.value)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                position === p.value
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Font size</label>
        <div className="flex gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFontSizeChange(f.value)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                fontSize === f.value
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text color */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Text color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={textColor}
            onChange={(e) => onTextColorChange(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-zinc-700 bg-transparent p-0"
          />
          <span className="font-mono text-xs text-zinc-500">{textColor}</span>
        </div>
      </div>

      {/* Background (for highlighter) */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Background color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-zinc-700 bg-transparent p-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-500">
          Background opacity: {Math.round(backgroundOpacity * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={backgroundOpacity}
          onChange={(e) => onBackgroundOpacityChange(parseFloat(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>

      <p className="text-xs text-zinc-600">Styles apply to all subtitles</p>
    </div>
  )
}

function StylePreview({ style, sample }: { style: CaptionStyle; sample: string }) {
  const words = sample.split(' ')
  switch (style) {
    case 'simple':
      return <span className="text-xs font-medium text-white">{sample}</span>
    case 'bold':
      return <span className="text-xs font-black text-white">{sample}</span>
    case 'karaoke':
      return (
        <span className="text-xs font-bold text-white">
          <span className="rounded bg-blue-500/60 px-0.5">{words[0]}</span>{' '}
          {words.slice(1).join(' ')}
        </span>
      )
    case 'glitch':
      return (
        <span
          className="text-xs font-bold text-blue-400"
          style={{ textShadow: '1px 0 #3b82f6, -1px 0 #38bdf8' }}
        >
          {sample}
        </span>
      )
    case 'highlighter':
      return (
        <span className="rounded bg-blue-400/80 px-1 py-0.5 text-xs font-medium text-white">
          {sample}
        </span>
      )
    default:
      return <span className="text-xs text-white">{sample}</span>
  }
}
