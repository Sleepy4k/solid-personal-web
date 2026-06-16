import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

interface ImgProps extends JSX.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  class?: string;
}

export function LazyImg(props: ImgProps) {
  const [local, rest] = splitProps(props, ["src", "alt", "class"]);
  return (
    <img
      src={local.src}
      alt={local.alt}
      loading="lazy"
      decoding="async"
      class={local.class}
      {...rest}
    />
  );
}

interface VideoProps extends JSX.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  class?: string;
}

export function LazyVideo(props: VideoProps) {
  const [local, rest] = splitProps(props, ["src", "class"]);
  return (
    <video
      preload="none"
      autoplay={false}
      muted
      loop
      class={local.class}
      {...rest}
    >
      <source src={local.src} />
    </video>
  );
}
