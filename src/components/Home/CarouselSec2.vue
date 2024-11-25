<script setup lang="ts">
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const props = defineProps<{
  clients: any[];
}>();

const items = Array.from({ length: 16 });
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
    <CarouselContent>
      <CarouselItem
        v-for="(client, index) in clients"
        :key="index"
        class="basis-1/2 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-[calc(100%/8)]"
      >
        <img :src="client" alt="Client" class="w-full h-auto" />
      </CarouselItem>
    </CarouselContent>
  </Carousel>
</template>
