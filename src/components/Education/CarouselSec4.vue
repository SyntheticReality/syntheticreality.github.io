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
  partners: any[];
}>();
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
        v-for="(partner, index) in partners"
        :key="index"
        class="basis-1/2 sm:basis-1/4 md:basis-1/5"
      >
        <div>
          <img :src="partner" alt="Partner" class="w-full h-auto" />
        </div>
      </CarouselItem>
    </CarouselContent>
  </Carousel>
</template>
