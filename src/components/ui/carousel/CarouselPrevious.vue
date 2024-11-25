<script setup lang="ts">
import type { WithClassAsProps } from "./interface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon } from "@radix-icons/vue";
import { useCarousel } from "./useCarousel";

const props = defineProps<WithClassAsProps>();

const { orientation, canScrollPrev, scrollPrev } = useCarousel();
</script>

<template>
  <Button
    :disabled="!canScrollPrev"
    :class="
      cn(
        'touch-manipulation absolute h-8 w-8 rounded-full p-0 border-none ',
        orientation === 'horizontal'
          ? '-left-12 top-1/2 -translate-y-1/2'
          : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        props.class
      )
    "
    variant="outline"
    @click="scrollPrev"
  >
    <slot>
      <!-- <ArrowLeftIcon class="h-4 w-4 text-current" /> -->
      <div>
        <svg
          class="size-5"
          viewBox="0 0 21 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.5 14.0981C-0.500003 12.9434 -0.500001 10.0566 1.5 8.90192L15.75 0.674681C17.75 -0.48002 20.25 0.963356 20.25 3.27276L20.25 19.7272C20.25 22.0366 17.75 23.48 15.75 22.3253L1.5 14.0981Z"
            fill="url(#paint0_linear_263_8)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_263_8"
              x1="0.369565"
              y1="22.2826"
              x2="21.9348"
              y2="0.0434788"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#999EF8" />
              <stop offset="1" stop-color="#D88EE0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="sr-only">Previous Slide</span>
    </slot>
  </Button>
</template>
