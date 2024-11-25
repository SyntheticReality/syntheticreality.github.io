<script setup lang="ts">
import type { WithClassAsProps } from "./interface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@radix-icons/vue";
import { useCarousel } from "./useCarousel";

const props = defineProps<WithClassAsProps>();

const { orientation, canScrollNext, scrollNext } = useCarousel();
</script>

<template>
  <Button
    :disabled="!canScrollNext"
    :class="
      cn(
        'touch-manipulation absolute h-8 w-8 rounded-full p-0 border-none',
        orientation === 'horizontal'
          ? '-right-12 top-1/2 -translate-y-1/2'
          : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        props.class
      )
    "
    variant="outline"
    @click="scrollNext"
  >
    <slot>
      <!-- <ArrowRightIcon class="h-4 w-4 text-current" /> -->
      <div>
        <svg
          class="size-5"
          viewBox="0 0 21 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.5 8.90193C21.5 10.0566 21.5 12.9434 19.5 14.0981L5.25 22.3253C3.25 23.48 0.750001 22.0366 0.750001 19.7272L0.750002 3.27276C0.750002 0.963354 3.25 -0.480018 5.25 0.674683L19.5 8.90193Z"
            fill="url(#paint0_linear_263_10)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_263_10"
              x1="20.6304"
              y1="0.717392"
              x2="-0.934781"
              y2="22.9565"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#999EF8" />
              <stop offset="1" stop-color="#D88EE0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="sr-only">Next Slide</span>
    </slot>
  </Button>
</template>
