<script setup lang="ts">
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "../ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const projects = [
  { name: "Cyberman 69", image: "project-2.png" },
  { name: "Quantum Hack", image: "project-3.png" },
  { name: "Whaacky Walls", image: "project-4.png" },
  { name: "Andean Skies", image: "project-5.png" },
];
</script>

<template>
  <!-- @vue-ignore -->
  <Carousel
    :opts="{
      align: 'start',
      loop: true,
    }"
    :plugins="[
      Autoplay({
        delay: 2000,
      }),
    ]"
  >
    <CarouselContent class="py-4">
      <CarouselItem
        v-for="(item, index) in projects"
        :key="index"
        class="basis-1/2 sm:basis-1/3 md:basis-1/4"
      >
        <div>
          <img
            :src="`/games/${item.image}`"
            :alt="item.name"
            class="aspect-[260/157] w-full rounded-[22px] object-cover shadow-md"
          />
        </div>
      </CarouselItem>
    </CarouselContent>
    <!-- <CarouselPrevious class="hidden xl:inline-flex" /> -->
    <!-- <CarouselNext class="hidden xl:inline-flex" /> -->
  </Carousel>
</template>
