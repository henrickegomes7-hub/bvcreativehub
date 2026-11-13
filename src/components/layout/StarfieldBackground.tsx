import React, { useEffect, useRef } from 'react';

interface StarfieldBackgroundProps {
  theme: 'light' | 'dark';
}

interface Star {
  x: number;
  y: number;
  z: number;
  colorIndex: number;
}

const STAR_COUNT = 140;

export const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let depth = 1;
    let focalLength = 1;
    let animationFrame = 0;
    let lastFrameTime = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = theme === 'dark'
      ? ['255,255,255', '147,197,253', '96,165,250']
      : ['8,49,129', '29,78,216', '59,130,246'];
    const stars: Star[] = [];

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      depth = Math.max(width, height) * 0.9;
      focalLength = width * 0.65;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const createStar = (): Star => {
      const z = depth * (0.25 + Math.random() * 0.75);
      return {
        x: ((Math.random() - 0.5) * width * z) / focalLength,
        y: ((Math.random() - 0.5) * height * z) / focalLength,
        z,
        colorIndex: Math.floor(Math.random() * colors.length),
      };
    };

    resize();
    for (let index = 0; index < STAR_COUNT; index += 1) {
      stars.push(createStar());
    }

    const drawFrame = (time: number) => {
      const frameScale = lastFrameTime
        ? Math.min((time - lastFrameTime) / (1000 / 60), 2)
        : 1;
      lastFrameTime = time;
      context.clearRect(0, 0, width, height);

      for (const star of stars) {
        const previousX = width / 2 + (star.x / star.z) * focalLength;
        const previousY = height / 2 + (star.y / star.z) * focalLength;
        if (!reducedMotion) star.z -= 3.2 * frameScale;

        const nextX = width / 2 + (star.x / star.z) * focalLength;
        const nextY = height / 2 + (star.y / star.z) * focalLength;
        const opacity = theme === 'dark'
          ? 0.08 + (1 - star.z / depth) * 0.34
          : 0.24 + (1 - star.z / depth) * 0.56;
        const color = colors[star.colorIndex];

        context.beginPath();
        if (reducedMotion) {
          context.arc(nextX, nextY, 1, 0, Math.PI * 2);
        } else {
          context.moveTo(previousX, previousY);
          context.lineTo(nextX, nextY);
        }
        context.strokeStyle = `rgba(${color},${opacity})`;
        context.fillStyle = `rgba(${color},${opacity})`;
        context.lineWidth = Math.max(
          theme === 'dark' ? 0.6 : 1,
          (1 - star.z / depth) * (theme === 'dark' ? 1.3 : 1.8),
        );
        context.stroke();
        if (reducedMotion) context.fill();

        if (
          !reducedMotion
          && (star.z <= 8 || nextX < -width || nextX > width * 2 || nextY < -height || nextY > height * 2)
        ) {
          Object.assign(star, createStar());
        }
      }

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(drawFrame);
    };

    const handleResize = () => {
      resize();
      if (reducedMotion) drawFrame(0);
    };

    window.addEventListener('resize', handleResize);
    animationFrame = window.requestAnimationFrame(drawFrame);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="hub-starfield" aria-hidden="true" />;
};
