declare module '@heroicons/react/24/solid' {
  import { ComponentType, SVGProps } from 'react';
  export type IconProps = SVGProps<SVGSVGElement>;
  export type IconComponent = ComponentType<IconProps>;
  const icons: Record<string, IconComponent>;
  export default icons;
}