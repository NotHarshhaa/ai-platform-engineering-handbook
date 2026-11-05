---
title: "Distributed AI Infrastructure"
description: "AI Platform Engineering Handbook - Week 13 - Distributed AI Infrastructure"
weight: 121
toc: true
---

---

# Distributed AI Infrastructure

## The Big Picture First

Everything we've covered so far in this Week 12 material has largely assumed one GPU, or perhaps a handful of them, working together on one machine. But the largest, most demanding AI workloads routinely need to be coordinated across dozens, hundreds, or even thousands of separate machines, each with its own GPUs, all working together as one unified whole. Examples include training a huge model or serving a massive volume of live traffic.

This introduces a different category of engineering challenge:

- How do you write code that runs across many separate machines at once?
- How do you keep track of and manage all of that underlying hardware reliably?
- How do you make sure the whole system scales up when demand increases, and scales back down when it doesn't, without constant manual intervention?

This final section covers the tools and concepts built to solve exactly this class of problem.

---

## 1. Ray Fundamentals

Ray is a distributed computing framework. The most important thing to understand about it is the problem it solves. Normally, writing code that correctly and reliably splits work across many machines is hard, specialized programming. It requires real expertise in distributed systems that most everyday developers don't have. Ray's core promise is to let a developer write largely ordinary-looking Python code, and have Ray handle the hard, complicated work of distributing that code's execution across a whole cluster.

In practice, this is refreshingly simple on the surface. A developer takes a regular Python function and adds a small marker to it, called a decorator. The decorator tells Ray, "this function can be run remotely, out on the distributed cluster, rather than only locally." From there, Ray takes care of the hard parts: figuring out which available machine should run a given piece of work, sending the work out to it, and collecting the results once the work finishes. This lets a developer write code that scales from their own laptop all the way up to a large cluster of many machines, without fundamentally rewriting it each time.

Ray isn't built exclusively for AI. It's a general-purpose distributed Python framework. But it has become especially popular in the AI world, because so much of modern AI development is already written in Python, and because AI workloads (training a model, or serving many simultaneous requests) benefit enormously from being spread across many machines working together. Ray Serve and Ray Train, covered next, are Ray's own libraries built on top of this same core foundation and tailored for AI-specific work.

---

## 2. Ray Serve

Ray Serve is Ray's dedicated library for serving AI models in production. It takes the general distributed computing capability that Ray provides and packages it into a tool purpose-built for the serving challenges we discussed in the previous explanation.

The value Ray Serve brings comes largely from flexibility, combined with distributed scaling built in from the ground up. Because it sits on top of Ray's general-purpose framework, Ray Serve can naturally spread a model's serving workload across many machines. It also supports fairly sophisticated serving patterns, such as:

- Running several different models together as one combined pipeline.
- Running custom, stateful serving logic made up of several cooperating components.

Narrower, single-purpose serving engines like vLLM or TensorRT-LLM, covered in the previous explanation, aren't as naturally suited to these patterns on their own.

In practice, Ray Serve is often used together with these specialized engines rather than instead of them. For example, a team might use Ray Serve to handle the broader orchestration and distributed scaling of a whole serving pipeline, while calling out to something like vLLM underneath to do the raw token-generation work as efficiently as possible. This combination gives a team the benefits of both: vLLM's deep serving-specific optimizations, layered under Ray Serve's more flexible distributed orchestration and scaling.

---

## 3. Ray Train

Ray Train is Ray's other major AI-specific library. This one is focused on distributed training rather than serving. It helps a team train a model across many machines and many GPUs working together, rather than being limited to a single machine.

Training a large AI model, especially a large language model, on one single GPU would take an impractically long time, potentially many months. For the very largest modern models, it wouldn't be realistically possible at all, given how enormous the total computation is. Distributed training splits this workload across many GPUs, often across many separate physical machines, all working in close coordination. The same total amount of work then gets done in a dramatically shorter, far more practical amount of time.

Ray Train handles a lot of the real complexity involved in doing this correctly:

- **Splitting the training data** appropriately across all the available workers.
- **Combining results.** It coordinates and combines the workers' partial results periodically, connecting directly back to the NCCL topic from the previous explanation.
- **Handling failures.** It gracefully handles the possibility that a worker machine unexpectedly fails or crashes partway through a long-running training job, without necessarily having to restart the entire run from scratch.

This kind of fault tolerance and automatic recovery matters enormously in practice. Large-scale distributed training runs can take many days or longer to finish, and with potentially hundreds or thousands of machines involved, the statistical likelihood of at least one machine failing along the way becomes significant.

---

## 4. Distributed Inference

Distributed inference is the broader practice of running an already-trained model's predictions (generating responses) across multiple machines or multiple GPUs together, rather than relying on a single GPU to handle everything.

There are two distinct reasons why distributed inference becomes necessary in practice:

- **Scale.** This connects back to the continuous batching and GPU scheduling concepts from the previous explanation. Serving a very large number of simultaneous users requires more total GPU capacity than any single GPU can provide, so incoming requests need to be spread across many GPUs.
- **Model size.** This connects back to the GPU memory discussion from the earlier explanation. Some of today's largest models are so big that they don't physically fit in a single GPU's memory at all. The model itself has to be split across several GPUs working together just to run, regardless of how much user traffic there is.

The second scenario introduces some additional technical complexity worth knowing about. When a single model is split across multiple GPUs, those GPUs need to communicate with each other frequently throughout the process of generating each token (connecting back to the NCCL topic from the previous explanation), since different parts of the same calculation sit on different GPUs. Making this cross-GPU communication fast and efficient becomes a critical factor in determining the final serving speed for these especially large, multi-GPU models.

---

## 5. Distributed Training

We touched on distributed training conceptually in the Ray Train section above. It's worth understanding the broader idea more fully here, since it's the foundational concept that makes training today's largest models possible in the first place.

There are two common general approaches:

- **Data parallelism.** A complete copy of the model is placed on each of several separate GPUs. Each GPU trains on its own different "slice" of the overall training data. The GPUs then regularly synchronize what they've learned (usually after every training step), so they all stay in agreement.
- **Model parallelism.** The model itself is split across several GPUs (connecting back to the distributed inference discussion above). This becomes necessary when a model is simply too large to fit in one GPU's memory, regardless of the training data involved.

Many large, real-world training setups combine both approaches together in sophisticated ways.

The core challenge running through distributed training, whichever approach is used, is the same one we've touched on repeatedly throughout this series: efficient communication and coordination between many separate machines. Every time the GPUs need to synchronize what they've learned, that communication step takes real time. If this overhead isn't managed well, a team can end up in a frustrating, counterintuitive situation. They add many more GPUs to a training job, but see disappointingly little improvement in training speed, because the extra hardware mostly sits there waiting on slow communication.

---

## 6. Kubernetes for AI

Kubernetes is a widely used, well-established, general-purpose system for managing containerized applications at production scale. You may recall Kubernetes coming up briefly in the earlier Docker security material, since it's the tool most commonly used to run Docker containers reliably at scale. Kubernetes for AI means using this same general infrastructure tool, but applying it specifically to running AI workloads.

Why would an organization want to use Kubernetes for AI work, rather than just using something like Ray on its own? The honest answer is that these tools work well together, and are not mutually exclusive alternatives. Kubernetes already provides a great deal of well-established infrastructure management capability:

- Scheduling work across many machines reliably.
- Handling failures gracefully when they inevitably occur.
- Managing networking and storage.

These capabilities matter just as much for AI workloads as for any other software. Instead of building all of this infrastructure again from scratch just for AI, an organization can run its AI-specific tools (like Ray, or the serving engines from the previous explanation) on top of Kubernetes, and benefit from everything Kubernetes already provides.

The catch is that Kubernetes, in its original general-purpose design, wasn't built with AI-specific concerns like GPUs deeply in mind. That's exactly why several of the tools covered in the rest of this explanation exist. They extend Kubernetes with the kind of AI-specific awareness (like proper GPU handling) that its general-purpose design doesn't fully provide out of the box.

---

## 7. GPU Scheduling in Kubernetes

We covered the general concept of GPU scheduling in the previous explanation, as the process of deciding which job gets to use which available GPU. GPU scheduling in Kubernetes means making this concept work correctly within Kubernetes itself, which requires some additional configuration beyond what Kubernetes provides on its own.

Here is the underlying problem. Kubernetes naturally understands ordinary computing resources, like a machine's CPU power and memory, and can schedule ordinary workloads across a cluster based on those. GPUs require extra configuration (typically through a component called a device plugin) before Kubernetes can understand and handle them at all. The cluster needs to be told which machines physically have GPUs. Kubernetes then needs to make sure a job requesting a GPU is scheduled onto one of those GPU machines, rather than mistakenly landing on a regular machine with no GPU.

Beyond simply recognizing that GPUs exist, more sophisticated GPU scheduling needs to handle some additional practical considerations:

- **GPU sharing.** A job might only need part of one GPU, and several smaller jobs may be able to share a single GPU together.
- **Gang scheduling.** One larger distributed training job may need many GPUs all at once. Gang scheduling makes sure all of them become available together, instead of the job starting with only some of the GPUs it needs.

---

## 8. NVIDIA GPU Operator

The NVIDIA GPU Operator is a tool that automates the process of setting up a Kubernetes cluster to work well with NVIDIA GPUs. It connects directly back to the NVIDIA driver stack, CUDA toolkit, and cuDNN topics covered at length in the previous explanation.

Here is the problem it solves. As we saw in the previous explanation, getting a GPU working properly requires several separate software layers, all installed correctly and with matching versions: the driver, the CUDA toolkit, and several related supporting pieces. Now imagine doing all of that setup manually across potentially hundreds of separate machines in one large Kubernetes cluster. It would be enormous, tedious, and error-prone work.

The GPU Operator automates this whole process:

- It detects which machines in the cluster physically have GPUs.
- It installs the correct, matching driver and CUDA versions onto each of them (along with other supporting components, such as the device plugin mentioned above).
- It keeps this software stack maintained and up to date over time.

This automation matters enormously in practice, because it greatly reduces both the initial setup effort and the ongoing maintenance burden of running GPU machines reliably at production scale.

---

## 9. KServe

KServe is a specialized tool built on top of Kubernetes and focused on serving AI models within a Kubernetes environment. It started out as part of a larger project called Kubeflow (covered next) before being spun off and maintained separately. It still works closely alongside Kubeflow.

The core idea behind KServe is to provide a standardized, consistent way of deploying and managing model-serving endpoints in Kubernetes, regardless of which serving engine (vLLM, TensorRT-LLM, or any of the others from the previous explanation) is doing the raw work of running the model. It gives you a well-defined, common way to describe "here's my model, here's where it's stored, and here's how I'd like it to scale." KServe then handles much of the underlying complexity of making that happen reliably.

A particularly valuable feature KServe provides is "scale-to-zero" (available in its serverless deployment mode). If a model endpoint isn't being used by anyone at a given moment, KServe can reduce its running resources all the way down to zero, and automatically bring it back up as soon as a new request arrives. This matters for cost efficiency, connecting back to the cost optimization concepts from the earlier Week 9 material. There is no good reason to keep an expensive GPU powered on and idle for a model that nobody is currently using.

---

## 10. Kubeflow

Kubeflow is a more complete, much broader Kubernetes-native machine learning platform. It's meaningfully broader in scope than the more narrowly focused tools we've covered so far. Instead of focusing on one piece of the machine learning lifecycle, Kubeflow bundles together several distinct components designed to cover the entire lifecycle as one unified package.

Kubeflow's components cover a lot of ground:

- **Pipelines** helps orchestrate the multi-step workflows involved in preparing training data, training a model, and then evaluating it afterward.
- **Training Operator** (called Kubeflow Trainer in newer versions) helps run distributed training jobs, connecting back to the distributed training concepts above.
- **KServe,** which we just covered, handles the model-serving piece of the overall platform.

Together, these components aim to provide one complete, end-to-end platform covering the entire machine learning lifecycle, all running natively on Kubernetes.

The tradeoff, compared to something like Ray (covered near the start of this explanation), is that Kubeflow's broader scope comes with real operational complexity. Running the full Kubeflow stack requires dedicated, ongoing platform engineering effort and real expertise to maintain reliably over time. Because of this, Kubeflow tends to be a strong fit for larger organizations that have dedicated platform teams, and that want one complete, unified platform for their whole machine learning workflow. The alternative is separately assembling and maintaining several different specialized tools, each covering only its own piece.

---

## 11. Autoscaling AI Workloads

Autoscaling is the general ability of a system to automatically adjust how much computing capacity it uses in response to changing real-time demand. It scales up when traffic or demand increases, and scales back down when demand decreases.

This matters enormously for AI workloads because real-world demand for an AI application often varies a great deal over time. A popular customer-facing application might see heavy traffic at certain times of day and light traffic at others. Without effective autoscaling, a team faces an uncomfortable tradeoff:

- **Provision for peak demand at all times.** There is enough GPU capacity for the busiest moment, but that expensive capacity sits idle most of the time.
- **Provision for average demand.** This risks poor performance or outages whenever demand spikes above the average.

Autoscaling for AI workloads introduces extra complexity beyond regular software autoscaling. GPUs take much longer to "warm up" and become ready than a lightweight web server does. A large model needs real time to load into a GPU's memory before it can serve any requests. Autoscaling decisions therefore need to account for this startup delay. This connects back to the scale-to-zero capability from the KServe section. A team has to balance the cost savings from scaling all the way down against the tradeoff of a slower response for the first request that arrives after a period of full idle time.

---

## 12. AI Infrastructure Monitoring

We covered AI observability at length in the earlier Week 9 material, but that discussion focused mainly on monitoring an AI application's behavior and output quality. AI infrastructure monitoring focuses instead on the underlying hardware and infrastructure itself. It watches how well the GPUs, the cluster, and the serving systems covered throughout this Week 12 material are performing at the infrastructure level.

This kind of monitoring generally tracks several distinct things together:

- **GPU utilization** measures how busy a GPU is at any given moment. A GPU sitting mostly idle represents wasted money, connecting back to the cost allocation and cost optimization concepts from Week 9 and Week 10.
- **Memory utilization** tracks how much of a GPU's memory is currently in use, connecting back to the KV cache and GPU memory discussions from this Week 12 material. Running consistently too close to the memory limit risks request failures.
- **Cluster health** tracks whether the individual machines in the cluster are all functioning correctly, and whether the GPU drivers and CUDA software stack remain in good working order.
- **Queue depth and scheduling delays** track how long jobs have to wait before they can start running, connecting back to the GPU scheduling concepts covered in this explanation.

The broader reason this monitoring matters connects to a theme that has run throughout this entire series: you can't effectively optimize or improve what you can't see and measure. A team without visibility into how its GPU infrastructure is performing has no reliable way of knowing whether it's getting proper value for the considerable money it spends on that infrastructure. It also has no early warning when a problem begins to emerge.

This brings the whole twelve-week series full circle, back to the core theme emphasized throughout this course. Building a good AI system was never just about getting it to work well once. It's about the full, ongoing discipline of keeping it working well, at every layer of the stack, from the highest-level prompt all the way down to the physical silicon chip, reliably, over an extended period of time.
