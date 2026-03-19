import React, { useEffect, useRef } from 'react';
import { animate, utils, stagger } from 'animejs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const red = '#FF4B4B';
const orange = '#FF8F42';
const skyblue = '#61C3FF';
const kingblue = '#5A87FF';

const StressReliefGame: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const $loopeds = Array.from(wrapperRef.current.querySelectorAll('.loop'));
    const $hovereds = Array.from(wrapperRef.current.querySelectorAll('.hover'));

    // Intro animation
    animate($loopeds, {
      scale: [0, 1],
      ease: 'inOutQuad',
      duration: 500,
      delay: stagger(120, { grid: [5, 5], from: 'center', start: 240 }),
    });

    // Interactions
    $hovereds.forEach((el: any) => {
      el.onmouseenter = () => {
        animate(el, {
          scale: [{ from: 1.4, to: .5, duration: 4000 }, { to: 1.6, duration: 2000 }],
          rotate: [{ to: 45, duration: 2000 }],
          zIndex: { to: 999, modifier: utils.round(0), ease: 'linear', duration: 25 },
          color: { to: el.dataset.clicked ? skyblue : orange, duration: 300, ease: 'out(4)' },
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, .3)',
          duration: 900,
          onBegin() { el.dataset.hover = 'true'; },
        });
      };

      el.onmousedown = () => {
        animate(el, {
          scale: { to: 1, ease: 'outElastic' },
          zIndex: { to: 1, modifier: utils.round(0), ease: 'linear', duration: 25 },
          color: { to: el.dataset.clicked ? red : kingblue, duration: 800 },
          duration: 400,
          onBegin() { 
            if (el.dataset.clicked) {
              el.removeAttribute('data-clicked');
            } else {
              el.dataset.clicked = 'true';
            }
          },
        });
      };

      el.onmouseleave = () => {
        animate(el, {
          scale: 1,
          rotate: { to: 0, duration: 1200 },
          zIndex: { to: 1, modifier: utils.round(0), ease: 'linear' },
          color: { to: el.dataset.clicked ? kingblue : red },
          boxShadow: { to: '0 0 0 0 rgba(0, 0, 0, 0)', ease: 'linear' },
          duration: 500,
          onBegin() { el.removeAttribute('data-hover'); },
        });
      };

      el.onmouseup = () => {
        animate(el, {
          scale: el.dataset.clicked ? 1 : (el.dataset.hover ? 1.2 : 1),
          zIndex: { to: el.dataset.hover ? 999 : 1, modifier: utils.round(0), ease: 'linear', duration: 25 },
          color: { to: el.dataset.clicked ? kingblue : (el.dataset.hover ? orange : red), duration: 500 },
          duration: 500
        });
      };
    });

    return () => {
      $hovereds.forEach((el: any) => {
        el.onmouseenter = null;
        el.onmousedown = null;
        el.onmouseleave = null;
        el.onmouseup = null;
      });
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 space-y-8">
      <div className="text-center max-w-md">
        <h2 className={cn(
          "text-2xl font-light mb-2 tracking-tight",
          theme === 'dark' ? "text-white" : "text-slate-900"
        )}>
          Stress Relief Grid
        </h2>
        <p className={cn(
          "text-sm opacity-60",
          theme === 'dark' ? "text-white" : "text-slate-600"
        )}>
          Hover, click, and play with the squares to relax your mind.
        </p>
      </div>
      
      <div 
        ref={wrapperRef}
        id="test-wrapper" 
        className="flex items-center justify-center flex-wrap w-[20rem] sm:w-[25rem]"
      >
        {Array.from({ length: 25 }).map((_, i) => (
          <div 
            key={i} 
            className="hover loop square relative w-12 h-12 sm:w-[4.75rem] sm:h-[4.75rem] m-0.5 sm:m-[0.125rem] bg-current text-[#FF4B4B] rounded-lg sm:rounded-xl cursor-pointer transition-shadow"
          />
        ))}
      </div>
    </div>
  );
};

export default StressReliefGame;
