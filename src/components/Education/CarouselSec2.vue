<script setup lang="ts">
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Autoplay from "embla-carousel-autoplay";

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
      <CarouselItem class="sm:basis-1/2 lg:basis-1/3">
        <div class="p-4">
          <div class="shadow-[0_4px_8.7px_rgba(0,0,0,0.25)] rounded-3xl">
            <img src="/education/1.png" alt="Put on a VR headset" />
            <div class="space-y-2 px-6 pb-6">
              <h3
                class="font-bold text-center text-xl xl:text-2xl md:max-w-[15ch] mx-auto"
              >
                Put on a VR headset
              </h3>
              <p class="text-center">
                Create a virtual classroom and share the join with other
                students.
              </p>
            </div>
          </div>
        </div>
      </CarouselItem>

      <CarouselItem class="sm:basis-1/2 lg:basis-1/3">
        <div class="p-4">
          <div class="shadow-[0_4px_8.7px_rgba(0,0,0,0.25)] rounded-2xl">
            <img src="/education/2.png" alt="Put on a VR headset" />
            <div class="space-y-2 px-6 pb-6">
              <h3
                class="font-bold text-center text-xl xl:text-2xl md:max-w-[15ch] mx-auto"
              >
                Prepare your class with AI
              </h3>
              <p class="text-center">
                Summon any image, text, and 3D object to set up your lesson.
              </p>
            </div>
          </div>
        </div>
      </CarouselItem>

      <CarouselItem class="sm:basis-1/2 lg:basis-1/3">
        <div class="p-4">
          <div class="shadow-[0_4px_8.7px_rgba(0,0,0,0.25)] rounded-2xl">
            <img src="/education/3.png" alt="Put on a VR headset" />
            <div class="space-y-2 px-6 pb-6">
              <h3
                class="font-bold text-center text-xl xl:text-2xl md:max-w-[15ch] mx-auto"
              >
                Experience virtual lessons
              </h3>
              <p class="text-center">
                Start teaching with immersive assets and session controls.
              </p>
            </div>
          </div>
        </div>
      </CarouselItem>
    </CarouselContent>
  </Carousel>
</template>
