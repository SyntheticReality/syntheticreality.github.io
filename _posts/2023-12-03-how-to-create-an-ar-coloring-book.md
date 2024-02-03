---
layout: post
title: "How to Create an AR Coloring Book"
description: In this article, we'll explore how to give 3D life to a coloring book.
author: "Alexis Salinas Mark"
categories: augmented-reality
date: 2023-12-03T12:00:00+00:00
---

<style>
  @keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .gradient-header {
    height: 3px;
    width: 80%;
    margin-left: auto;
    margin-right: auto;
    background: linear-gradient(270deg, #9065b0, #6c4986, #999ef8, #d88ee0);
    background-size: 800% 800%;
    -webkit-animation: gradientBG 20s ease infinite;
    -moz-animation: gradientBG 20s ease infinite;
    animation: gradientBG 20s ease infinite;
  }
</style>

<div class="gradient-header"></div>
<br>
<h3>Augmented Reality (AR) shines when it forms meaningful links with the real world, and in this article, we'll explore how to do so by giving 3D life to a coloring book.</h3>
<br>
<img src="https://miro.medium.com/v2/resize:fit:720/format:webp/0*5nUS6_gyi8Pnd2Wu.gif" alt="Augmented Reality Coloring Books" style="display: block; margin-left: auto; margin-right: auto; max-width: 100%; width: 620px; height: auto;">
<p style="text-align: center;">🖼️ Augmented reality coloring books.</p>
<br>
<p><strong>Spawning 3D objects in augmented reality often feels very basic</strong> there’s usually not much to do besides looking at them, and that’s because their only relation to the real world is their position. <strong>Establishing multiple relations between virtual and real is where AR apps need to focus</strong>.</p>
<p>This concept was put to the test when a Peruvian school approached us to create an AR coloring book app in 2 weeks. The idea was simple: <strong>have kids color pages and then use AR to transfer the colors into animated 3D objects</strong>. This approach allowed us to go beyond merely positioning virtual objects in the real world; it connected the act of coloring with the digital realm.</p>
<br>


<h2 style="text-align: center;"><strong>Design</strong></h2>
<div class="gradient-header"></div>
<br>
<p>With a very tight schedule, we opted for simple designs for the user interface (UI) and a user experience (UX) stripped down to the bare minimum. A key consideration was having an area on the coloring pages that wouldn’t change to allow the image recognition to work out. Aided by DALL-E, <strong>we created richly detailed frames that wouldn’t be colored</strong>, serving as a strong and distinct element for image recognition.</p>
<br>
<img src="https://miro.medium.com/v2/resize:fit:700/1*NlkIumYouOjySMlfzh22tQ.png" alt="User Interface and Coloring Pages" style="display: block; margin-left: auto; margin-right: auto; max-width: 100%; width: 620px; height: auto;">
<p style="text-align: center;">🖥️ User interface and coloring pages.</p>
<br>


<h2 style="text-align: center;"><strong>Development</strong></h2>
<div class="gradient-header"></div>
<br>
<p><strong>The primary development package used was <a href="https://developer.vuforia.com/">Vuforia</a></strong>, a software development kit (SDK) specialized in augmented reality (AR). Ricardo Villanueva, XR developer, guides us through this process and shares some of the key factors in choosing Vuforia:</p>
<strong>△ Object and Marker Recognition</strong>: Vuforia offers a robust object and marker recognition system. In this case, Vuforia’s detection demonstrated superior image recognition and tracking compared to other SDKs like <a href="https://www.easyar.com/">EasyAR</a>, <a href="https://developer.maxst.com/">Maxst AR</a>, and <a href="https://unity.com/unity/features/arfoundation">AR Foundation</a>.
<br>
<strong>△ Broad Device Compatibility</strong>: Vuforia supports slightly more devices than AR Foundation, including a wide array of smartphones and tablets, enhancing its user accessibility.
<br>
<strong>△ Cross-Platform Development</strong>: It enables AR app development for various platforms, including iOS, Android, and select Windows devices.
<br>
<strong>△ Easy Integration</strong>: Finally, it easily integrates with Unity through a package manager and has extensive documentation and an active developer community.
<p>Additionally, <strong>the application was based on an <a href="https://github.com/airar-dev/Unity-AR-ColorMapping">augmented reality coloring library</a></strong> developed by the Korean company AirAR. This library allows the detection of colors from images captured by the camera and applies them to a Unity material, which can then be applied to virtual 3D objects.</p>
<br>
<img src="https://miro.medium.com/v2/resize:fit:700/1*XATp938lBYxmiGJaZQxYMQ.png" alt="AR Coloring in Action" style="display: block; margin-left: auto; margin-right: auto; max-width: 100%; width: 620px; height: auto;">
<p style="text-align: center;">🎨 AR coloring in action.</p>
<br>

<h2 style="text-align: center;"><strong>How it Works</strong></h2>
<div class="gradient-header"></div>
<br>
<p>The step-by-step process is as follows:</p>
<strong>1. The device’s camera detects the coloring book page</strong>, which has been set as the marker for spawning the 3D objects without colors.
<br>
<strong>2. Users press the “Color” button,</strong> and the app uses color mapping to detect and process the image’s colors captured by the camera.
<br>
<strong>3. The detected colors are applied to a texture using UV mapping</strong>, where the 3D model is represented in 2D to determine which sectors of the model get painted.
<br> <strong>4.</strong> Finally, the texture is applied to the 3D model, <strong>displaying the colors of the color page</strong>. The number of vertices and polygons was kept low to avoid potential issues or lag.
<br>
<br>
<img src="https://miro.medium.com/v2/resize:fit:700/1*JSc2VQHKI4nIp5TJuknKgA.png" alt="More AR Coloring Fun" style="display: block; margin-left: auto; margin-right: auto; max-width: 100%; width: 620px; height: auto;">
<p style="text-align: center;">🎨 More AR coloring fun.</p>
<br>

<h2 style="text-align: center;"><strong>An Immersive Future for Education</strong></h2>
<div class="gradient-header"></div>
<br>
<p>The enthusiastic response from the students at the school was a testament to the potential of the intersection of technology and education. Their deep involvement and joy as they watched their colored pages come to life in 3D models highlighted an important lesson: <strong>technology like AR can greatly enhance learning by making it interactive, immersive, and fun</strong>.</p>
<br>
<img src="https://miro.medium.com/v2/resize:fit:1442/1*Hu_da2SeJBehRZBMVEQ6dg.png" alt="Engagement Image 2" style="display: block; margin-left: auto; margin-right: auto; max-width: 100%; width: 620px; height: auto;">
<p style="text-align: center;">📈 Engagement with the activity was <strong>greatly enhanced</strong>.</p>
<br>
<p>Looking forward, <strong>the potential applications of AR in educational settings are vast and largely untapped</strong>. History lessons in which students can explore historical civilizations in 3D, or biology classes in which they can interact with complicated ecosystems, all powered by AR, promise to transform traditional learning into an immersive, interactive journey.</p>
<br>
<img src="https://miro.medium.com/v2/resize:fit:500/0*kNLN5iejOccGW-Jm.gif" alt="AR in Education" style="display: block; margin-left: auto; margin-right: auto; max-width: 100%; width: 620px; height: auto;">
<p style="text-align: center;">⚛️ Boom!</p>
<br>
<br>
<br>
