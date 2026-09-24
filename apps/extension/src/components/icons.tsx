import type { JSX } from "preact";

interface IconProps extends JSX.SVGAttributes<SVGSVGElement> {
  size?: number | string;
  weight?: "regular" | "bold" | "fill" | "duotone";
  class?: string;
}

export function LightningIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M215.79,118.17a8,8,0,0,0-7.79-6.17H152V40a8,8,0,0,0-13.66-5.66l-96,96a8,8,0,0,0,5.66,13.66H104v72a8,8,0,0,0,13.66,5.66l96-96A8,8,0,0,0,215.79,118.17ZM120,204.69V144a8,8,0,0,0-8-8H59.31L136,51.31V112a8,8,0,0,0,8,8h52.69Z" />
    </svg>
  );
}

export function DropIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M174.62,80.34,133.66,39.38a8,8,0,0,0-11.32,0L81.38,80.34a72,72,0,1,0,93.24,0ZM128,208a56,56,0,0,1-39.6-95.6l39.6-39.6,39.6,39.6A56,56,0,0,1,128,208Z" />
    </svg>
  );
}

export function FlameIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M173.2,74.79A99.85,99.85,0,0,0,136,24.6a8,8,0,0,0-11.5,8.87,144.17,144.17,0,0,1,1.55,30.73A88.1,88.1,0,1,0,192,144c0-1.85-.06-3.69-.17-5.52a8,8,0,0,0-12.78-5.69,87.35,87.35,0,0,1-17.65,11.89,72.1,72.1,0,0,0,11.8-69.89ZM128,216a72,72,0,0,1-64.88-103.32,80,80,0,0,0,51.81-55.83,116.14,116.14,0,0,1,28.84,33.5,88.08,88.08,0,0,0,32.28,95.53A71.74,71.74,0,0,1,128,216Z" />
    </svg>
  );
}

export function GlobeIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM40,128a87.58,87.58,0,0,1,8.39-37.49l64.12,64.12a16,16,0,0,0,22.62,0L144,145.76V168a16,16,0,0,0,16,16h8a8,8,0,0,1,8,8v12.3A88.07,88.07,0,0,1,40,128Zm157.94,56.78A23.86,23.86,0,0,0,184,168h-8V145.76l-8.89,8.88a32,32,0,0,1-45.26,0L68.7,101.49A88,88,0,0,1,209.52,99.2l-23,23a16,16,0,0,0,0,22.63l15.18,15.17A88.16,88.16,0,0,1,197.94,184.78Z" />
    </svg>
  );
}

export function DeviceMobileIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16ZM72,40a8,8,0,0,1,8-8h96a8,8,0,0,1,8,8V184H72ZM176,224H80a8,8,0,0,1-8-8V200H184v16A8,8,0,0,1,176,224Z" />
    </svg>
  );
}

export function CreditCardIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M224,48H32A24,24,0,0,0,8,72V184a24,24,0,0,0,24,24H224a24,24,0,0,0,24-24V72A24,24,0,0,0,224,48Zm8,136a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V128H232Zm0-80H24V72a8,8,0,0,1,8-8H224a8,8,0,0,1,8,8Z" />
    </svg>
  );
}

export function FileTextIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM152,44l44,44H152ZM200,216H56V40h80V96a8,8,0,0,0,8,8h56V216ZM168,144a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,144Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,176Z" />
    </svg>
  );
}

export function ClockIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-109.66a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,156.69l50.34-50.35A8,8,0,0,1,173.66,106.34Z" />
    </svg>
  );
}

export function WarningCircleIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z" />
    </svg>
  );
}

export function PlayIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M232.4,114.49,88.32,26.35A16,16,0,0,0,64,40.2V215.8a16,16,0,0,0,24.32,13.85L232.4,141.51a16,16,0,0,0,0-27ZM80,215.8V40.2L224,128Z" />
    </svg>
  );
}

export function PlusIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  );
}

export function XIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  );
}

export function PencilSimpleIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.32,96A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.31,64l24-24L216,84.69Z" />
    </svg>
  );
}

export function BuildingsIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M240,208H224V96a16,16,0,0,0-16-16H144V40a16,16,0,0,0-16-16H40A16,16,0,0,0,24,40V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM40,40h88V208H40ZM208,96V208H144V96ZM72,72a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16H80A8,8,0,0,1,72,72Zm0,40a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16H80A8,8,0,0,1,72,112Zm0,40a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16H80A8,8,0,0,1,72,152Zm96-16a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16h-8A8,8,0,0,1,168,136Zm0,40a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16h-8A8,8,0,0,1,168,176Z" />
    </svg>
  );
}

export function LinkSimpleIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M136.37,187.63a8,8,0,0,1,0,11.32l-32,32a48,48,0,0,1-67.88-67.88l32-32a48,48,0,0,1,66.12-1.57,8,8,0,0,1-10.82,11.75,32,32,0,0,0-44,1.06l-32,32a32,32,0,0,0,45.26,45.26l32-32A8,8,0,0,1,136.37,187.63Zm83.26-151.26a48,48,0,0,0-67.88,0l-32,32a48,48,0,0,0,66.12,69.45,8,8,0,0,0-10.82-11.75,32,32,0,0,1-44-1.06l32-32a32,32,0,0,1,45.26,45.26l-32,32a8,8,0,0,0,11.32,11.32l32-32A48,48,0,0,0,219.63,36.37Z" />
    </svg>
  );
}

export function InfoIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z" />
    </svg>
  );
}

export function ListChecksIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M136,120h80a8,8,0,0,0,0-16H136a8,8,0,0,0,0,16Zm80,32H136a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16Zm0,48H136a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16ZM40,80A40,40,0,1,1,80,120,40,40,0,0,1,40,80Zm64,0A24,24,0,1,0,80,104,24,24,0,0,0,104,80Zm-21.66,82.34a8,8,0,0,0-11.32,0L48,185.37l-9.66-9.65a8,8,0,0,0-11.32,11.32l15.32,15.31a8,8,0,0,0,11.32,0l28.68-28.69A8,8,0,0,0,82.34,162.34Z" />
    </svg>
  );
}

export function SparkleIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M213.85,125.46l-46.7-18.68L148.46,60.08a16,16,0,0,0-29.69,0L100.08,106.78,53.38,125.46a16,16,0,0,0,0,29.7l46.7,18.67,18.69,46.7a16,16,0,0,0,29.69,0l18.69-46.7,46.7-18.67A16,16,0,0,0,213.85,125.46ZM133.61,164.71a8,8,0,0,0-4.63,4.63l-15.37,38.42L98.24,169.34a8,8,0,0,0-4.63-4.63L55.19,149.34l38.42-15.37a8,8,0,0,0,4.63-4.63L113.61,90.92l15.37,38.42a8,8,0,0,0,4.63,4.63l38.42,15.37Z" />
    </svg>
  );
}

export function TrashIcon({ size = 16, class: className = "", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      class={`inline-block shrink-0 align-middle ${className}`}
      {...props}
    >
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM192,208H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
    </svg>
  );
}
