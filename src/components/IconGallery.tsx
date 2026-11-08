import { PixelArt } from './PixelArt'
import { ICON_NAMES, frameCount } from '../lib/pixelart'

/** Every sprite at once. Open the app with #icons on the end of the address. */
export function IconGallery() {
  return (
    <div className="space-y-4">
      <h1 className="font-pixel text-[14px] uppercase">Pixel icons</h1>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {ICON_NAMES.map((n) => (
          <li key={n} className="pcard flex flex-col items-center gap-2 bg-white p-3">
            <div className="flex items-end gap-2">
              <PixelArt name={n} size={5} />
              {frameCount(n) > 1 && <PixelArt name={n} size={5} frame={1} />}
            </div>
            <PixelArt name={n} size={2} animate />
            <span className="font-pixel text-[12px] uppercase">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
