---
title: "GPU Computing Fundamentals"
description: "AI Platform Engineering Handbook - Week 13 - GPU Computing Fundamentals"
weight: 122
toc: true
---

---

# GPU Computing Fundamentals

## The Big Picture First

Everything we've discussed throughout this series so far — RAG, agents, LLMOps, security — has assumed that somewhere underneath it all, physical computing hardware is doing the heavy lifting of running these models. Week 12 finally opens up the hood and looks at what is happening at the hardware level.

Here is the core fact that explains almost everything in this explanation. Training and running large language models involves an enormous number of relatively simple mathematical calculations, mostly multiplying and adding numbers together, over and over, at massive scale. Regular computer processors, despite being powerful and flexible, are not the best-suited tool for this kind of work. A different kind of processor, the GPU, turns out to be dramatically better suited to it. Understanding why is the foundation for understanding this entire week's material.

---

## 1. AI Infrastructure Overview

AI infrastructure is the complete stack of physical hardware and supporting software that makes it possible to train and run AI models at meaningful scale. It runs from the physical computer chips doing the raw calculations, all the way up through the software layers that let a developer write and run AI code without personally understanding every detail of the underlying hardware.

It helps to think of this as a layered stack, where each layer builds on top of the one below it:

- **Physical hardware (the bottom layer).** This includes the specialized processors (covered shortly), the physical memory, and the networking that connects many machines together.
- **Low-level software.** This layer lets higher-level programs communicate with and make use of that specialized hardware. We'll cover several of its pieces later in this explanation, such as the driver stack and the CUDA toolkit.
- **Higher-level software frameworks.** These are tools like PyTorch and TensorFlow, which you may have come across if you've done any hands-on AI development. Most developers work with these directly, day to day, without thinking too hard about what is happening underneath.

Why does this layered infrastructure matter so much? Because the hardware and software choices made at each layer have an enormous, direct impact on how fast a model can be trained, how much it costs to run, and how many users it can serve at once. A team that understands this stack well can make much better decisions about what hardware to buy or rent, and how to configure it, than a team that treats it as a mysterious black box.

---

## 2. GPU Architecture

GPU stands for Graphics Processing Unit. To understand why it has become so central to AI, it helps to know where it came from. GPUs were originally built for an entirely different purpose: rendering graphics for video games and other visual applications. In those applications, a computer needs to calculate the color and position of millions of individual pixels on a screen, many times every second, to produce smooth, moving images.

Here is the key architectural insight that turned out to matter enormously for AI. Calculating the value of one pixel is a small, simple, well-defined mathematical task. Critically, the calculation for one pixel generally doesn't depend on the calculation for another pixel. That means millions of these simple calculations can all be done at the same time, independently and in parallel, rather than strictly one after another.

GPU designers built chips specifically around this insight. A regular computer processor, a CPU, has just a few individually very powerful processing units. A GPU instead contains many thousands of smaller, individually simpler processing units, all working at the same time in parallel.

It turns out that the core mathematical operations involved in running an AI model have exactly this same character. Take matrix multiplication, which means multiplying huge grids of numbers together. It is the fundamental core operation underlying almost everything a neural network does. Like rendering pixels, it consists of an enormous number of relatively simple calculations that can all be done in parallel. This is exactly why GPUs, originally built for a different purpose, turned out to be so remarkably well suited to AI workloads once people started using them that way.

---

## 3. CPU vs GPU

Now that we understand the basic architectural difference, it's worth comparing CPUs and GPUs directly. Knowing exactly when each one is the better tool for a given job is an important part of understanding AI infrastructure.

A CPU (Central Processing Unit) is the general-purpose "brain" of a regular computer. It is designed to be highly flexible and very good at handling a wide, diverse range of tasks, often one complex task after another, in a fairly sequential order. A CPU typically has a relatively small number of individually very powerful, sophisticated cores. Common machines have somewhere between around 4 and 64, and high-end server processors can have more. Each core can handle complex, varied logic and make rapid, sophisticated decisions.

A GPU, by contrast, has thousands of individually much simpler cores, all optimized for doing the same type of relatively simple calculation, over and over, on many different pieces of data at the same time. A helpful analogy:

- Think of a CPU as a small team of a few brilliant, highly skilled specialists. Each one can tackle a wide range of complex problems, one after another.
- Think of a GPU as an enormous crowd of thousands of people. Each one can only do one simple task, like basic addition, but they can all do it at the same time.

For tasks that need complex, varied, sequential decision-making, such as running a website's core application logic or managing a computer's operating system, a CPU is the better tool. For tasks that involve doing the same relatively simple calculation an enormous number of times in parallel, such as training or running an AI model, a GPU is dramatically faster, often by many multiples, for exactly this kind of work.

---

## 4. CUDA Fundamentals

Knowing that GPUs are well suited to AI workloads is one thing. But a GPU's specialized hardware, on its own, doesn't automatically know how to run AI code. CUDA (originally short for Compute Unified Device Architecture) is a platform and programming approach created by NVIDIA, currently the dominant maker of GPUs used for AI. It lets developers write code that can run on, and make full use of, a GPU's specialized parallel architecture.

Here is the problem CUDA solves. Writing code that correctly and efficiently splits a task across thousands of simple parallel cores, and then coordinates and combines all their individual results, is a different and more complex kind of programming than writing regular, sequential code for a CPU. CUDA gives developers a structured, well-documented way to write this kind of parallel code, without needing to understand every low-level detail of the GPU's physical hardware.

CUDA has become enormously important across the whole AI industry. It is not just one technical tool among several interchangeable options. It has been adopted and embedded so broadly and so deeply that:

- Most major AI frameworks, like PyTorch, are built with deep, extensive CUDA support.
- A massive amount of the world's existing AI code and infrastructure assumes CUDA is available and in use.

This is a significant part of why NVIDIA's GPUs have become so dominant in AI. It's not only that their physical hardware is particularly good (though it is). CUDA, as a whole software platform and surrounding ecosystem, has become deeply embedded throughout the industry's software.

---

## 5. CUDA Cores

CUDA cores are the individual processing units that physically sit inside an NVIDIA GPU. They are the actual hardware components that CUDA, the broader software platform we just discussed, is designed to let a developer's code use efficiently.

Going back to our CPU-versus-GPU comparison, CUDA cores are the concrete embodiment of the "thousands of simple processing units" idea. A single modern, high-end NVIDIA GPU can contain many thousands of CUDA cores, sometimes well over ten thousand, depending on the specific model and generation of the chip. Each individual core is relatively simple and not very powerful on its own. But having thousands of them work together in parallel is what gives a GPU its enormous total computational power for the kinds of parallel workloads we've been discussing.

It's worth understanding that the number of CUDA cores a GPU has is not the complete picture of its real performance. Other factors matter too:

- The speed and efficiency of each individual core.
- How quickly the chip can access its own memory (covered as a separate topic below).
- Other specialized hardware features, such as the tensor cores covered shortly.

Still, the number of CUDA cores remains a useful, commonly cited, rough indicator of a GPU's raw parallel processing capability, and it is often referenced when people compare different GPU models.

---

## 6. GPU Memory

GPU memory, often called VRAM (for "video RAM," reflecting graphics cards' original purpose), is the dedicated physical memory that sits directly on a GPU. It is used to store the data the GPU is currently working with. It is separate from a computer's main system memory (RAM), which the CPU primarily uses for its own work. In data-center GPUs, this memory is usually a faster, more specialized type known as HBM (high bandwidth memory).

GPU memory matters enormously in practice, for a simple, concrete reason. An AI model, along with all the data it is currently working with (like a batch of text being processed), needs to fit within the GPU's available memory for the GPU to work with it at all. Modern large language models can be enormous. Some of the largest need many tens or even hundreds of gigabytes of memory just to hold the model's learned parameters, before even counting the additional working data needed to run it.

If a model doesn't fit in a single GPU's memory, you have two options:

- Use a GPU with considerably more memory.
- Split the model across multiple GPUs working together. This is a real technical challenge in its own right, and it connects directly to the NCCL topic covered below.

GPU memory capacity has become one of the most significant and most often limiting factors in modern AI infrastructure, because of how large today's models have grown. A GPU with excellent raw processing speed but insufficient memory simply can't run a given large model at all, no matter how fast its individual cores are. This is why, when people compare GPU models for serious AI work, memory capacity is very often one of the most heavily weighted factors, right alongside raw processing speed.

---

## 7. Tensor Cores

Tensor cores are a more specialized type of processing unit found on newer NVIDIA GPUs. They are separate from the more general-purpose CUDA cores discussed above. They are specifically built to accelerate one particular type of mathematical operation that is especially central to how AI models work.

That operation is matrix multiplication, which we mentioned earlier in the GPU Architecture section as the fundamental core operation underlying almost everything a neural network does. Regular CUDA cores are already quite good at this kind of calculation. Tensor cores are even more specialized, built specifically for certain kinds of matrix math, and they can perform it considerably faster than regular CUDA cores alone.

This additional specialization matters a great deal for real-world AI performance. NVIDIA has reported that tensor cores can deliver dramatically faster performance on exactly the kinds of calculations that AI models rely on, compared with using regular CUDA cores alone for the same work.

This is a clear illustration of a broader principle in modern hardware design. Instead of only building more and more general-purpose processing power, chip designers increasingly build dedicated hardware optimized for especially common and important types of calculations. Matrix multiplication is so central to modern AI that tensor cores are a particularly clear and well-motivated example of this specialization in real hardware.

---

## 8. NVIDIA Driver Stack

A driver, as a general software concept, is the piece of software that lets a computer's operating system communicate with and control a specific piece of physical hardware. The NVIDIA driver stack is the collection of software layers that lets a computer recognize and make use of an installed NVIDIA GPU in the first place.

Without a properly installed and functioning driver, an operating system has no reliable way of knowing how to communicate with a GPU at all. The physical chip might be correctly installed inside the machine, but without the matching driver software, the rest of the computer can't make any real use of it. The driver handles the lowest-level, most fundamental communication with the hardware itself. This includes sending computational work to the GPU to be processed, and retrieving the results once that work is finished.

For anyone setting up AI infrastructure themselves, getting the correct driver version installed is one of the most common and frustrating early challenges. Different driver versions need to match up with the other software layers above them in the stack, such as the CUDA toolkit covered next. A mismatch between the versions of these layers is a very common, well-known source of technical problems when trying to get a GPU-based AI system up and running.

---

## 9. CUDA Toolkit

The CUDA toolkit is the complete collection of software tools, code libraries, and documentation that NVIDIA provides so that developers can write, build, and run CUDA-based code. It is a distinct software layer one level above the raw driver we just discussed. It provides the higher-level tools a developer needs for real, hands-on AI development work.

The driver handles the lowest-level communication between the operating system and the physical chip. The CUDA toolkit provides the higher-level tools a developer uses day to day:

- **A compiler.** This is the tool that translates a developer's human-written code into the low-level instructions a GPU can understand and execute.
- **Pre-built code libraries.** These handle a lot of the common, repeated underlying computational work, so developers don't each need to write all of that complex code from scratch every time.

Most everyday developers use a higher-level framework like PyTorch (mentioned at the start of this explanation), and for them most of the toolkit's complexity stays hidden. A framework like PyTorch handles most of the direct interaction with CUDA on the developer's behalf, so a typical developer doesn't need to write raw CUDA code by hand. Still, having the correct, matching version of the CUDA toolkit installed underneath everything else remains essential, since these frameworks are built directly on top of it.

---

## 10. cuDNN

cuDNN (short for "CUDA Deep Neural Network library") is another specialized software library, built on top of the more general CUDA toolkit. It is optimized for the particular calculations that show up repeatedly in deep learning and neural networks. By contrast, the general CUDA toolkit supports a much broader range of parallel computing tasks.

You can think of the relationship as similar to the one between CUDA cores and tensor cores discussed earlier. CUDA, as the more general toolkit, lets you do general-purpose parallel computing of many kinds. cuDNN further optimizes for the specific operations that come up over and over in deep learning, such as the mathematical operations involved in a neural network's individual layers.

The practical value of cuDNN is real, meaningful extra speed for exactly these deep-learning operations, beyond what you would get from the general CUDA toolkit alone. As with the CUDA toolkit, most developers don't interact with cuDNN directly. It operates quietly underneath higher-level frameworks like PyTorch. But having the correct, matching version installed underneath everything else meaningfully affects how fast a model trains and runs in everyday practice.

---

## 11. NCCL

NCCL (pronounced "nickel," and short for "NVIDIA Collective Communications Library") addresses a practical problem that comes up once you need several GPUs working closely together. Given how enormous today's largest AI models have become (connecting back to the GPU memory discussion above), this is an extremely common, everyday scenario.

When you train or run an AI model across several GPUs at once, those GPUs need to communicate with each other efficiently and reliably. For example, they need to share and combine their individual partial results, so that the whole system can arrive at one unified, correct final answer. NCCL is designed to handle this communication as efficiently and reliably as possible. It gives developers a set of well-designed, pre-built, ready-to-use tools for coordinating and sharing data across multiple GPUs. Developers don't each need to write all of that complex multi-GPU coordination logic by hand, from scratch, every time.

This becomes increasingly important the larger an AI workload gets. Training one of today's largest language models often requires many hundreds, or sometimes thousands, of GPUs working together in close coordination. How well those GPUs can communicate with each other becomes a significant factor in the whole system's real-world performance, right alongside the raw computational power of each GPU taken individually.

---

## 12. GPU Scheduling

GPU scheduling is the process of deciding which task or job gets to use a given available GPU, and exactly when. It becomes an especially important concern in shared environments, where multiple users, teams, or applications all need to share access to a limited pool of GPU resources.

Here is the practical problem GPU scheduling needs to solve. GPUs, particularly powerful, high-end ones suited to serious AI work, are expensive pieces of specialized hardware. Organizations sensibly don't want to buy a completely separate, dedicated GPU for every team or project they have running. Instead, they typically maintain a shared pool of GPUs, and a scheduling system decides which job gets to use which GPU, and for how long, in a fair, efficient way.

Good GPU scheduling needs to balance several competing considerations at once:

- **Utilization.** It should keep the whole pool of GPUs as busy and efficiently used as reasonably possible. An expensive GPU sitting idle is wasted money.
- **Fairness.** It should be reasonably fair across the organization's different users and teams, rather than letting any one team or user monopolize the entire shared pool.
- **Priority.** It should handle jobs of different priority appropriately. For example, an urgent, time-sensitive production request should reasonably take priority over a much less time-sensitive, experimental research job that can easily wait its turn.

This connects closely back to the rate limiting and cost allocation concepts from the earlier Week 10 enterprise architecture material. GPU scheduling is the same fundamental idea of fairly, sensibly, and efficiently sharing a limited, valuable resource across many competing internal consumers. The difference is that here it applies directly to physical computing hardware, rather than to the software-based API rate limits discussed in that earlier explanation.
