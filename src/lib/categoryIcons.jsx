import meatIcon from '../assets/icons/category-meat.png'
import fishIcon from '../assets/icons/category-fish.png'
import vegetableIcon from '../assets/icons/category-vegetable.png'
import riceIcon from '../assets/icons/category-rice.png'
import noodleIcon from '../assets/icons/category-noodle.png'
import pressureIcon from '../assets/icons/category-pressure.png'
import otherIcon from '../assets/icons/category-other.png'

export const CATEGORY_ICON_SRC = {
  肉: meatIcon,
  魚: fishIcon,
  野菜: vegetableIcon,
  ご飯: riceIcon,
  麺: noodleIcon,
  圧力鍋: pressureIcon,
  その他: otherIcon,
}

export function CategoryIcon({ category, className = 'h-8 w-8' }) {
  const src = CATEGORY_ICON_SRC[category] || otherIcon
  return <img src={src} alt={category} className={`shrink-0 rounded-full object-cover ${className}`} />
}
