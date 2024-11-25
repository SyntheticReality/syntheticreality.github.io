<script setup lang="ts">
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const projects = [
  { name: "Project 1", image: "project-1.png" },
  { name: "Project 2", image: "project-2.png" },
  { name: "Project 3", image: "project-3.png" },
  { name: "Project 4", image: "project-4.png" },
  { name: "Project 5", image: "project-5.png" },
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
        class="basis-1/2 sm:basis-1/4 md:basis-1/5 lg:basis-1/5"
      >
        <div>
          <img
            :src="`/home/${item.image}`"
            :alt="item.name"
            class="shadow-md rounded-[22px]"
          />
        </div>
      </CarouselItem>
    </CarouselContent>
    <CarouselPrevious class="hidden xl:inline-flex" />
    <CarouselNext class="hidden xl:inline-flex" />
  </Carousel>
</template>
