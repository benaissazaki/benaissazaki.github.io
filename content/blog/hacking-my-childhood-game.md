---
title: "Hacking my childhood game"
date: 2023-04-16T12:00:00Z
emoji: "🕹️"
description: I will detail the step-by-step process I followed to change the behavior of Battle For Middle-Earth II
---

I recently started to explore Game Hacking, and I find it fascinating. The thought process is quite different from programming since it asks “How was this created?” instead of “How do I create this?”.

In this blog post, I will detail the step-by-step process I followed to change the behavior of one of my favorite video games.

## Tools used

*   Windows 11
*   Cheat Engine
*   x32dbg
*   The Lord of the Rings: Battle for Middle Earth II

## The objective

One of the games I spent a lot of time on in my childhood was The Lord of the Rings: Battle for Middle Earth II. It is a Real-Time Strategy (RTS) game, where you can control units, gather resources, and build bases to beat the enemy on the battlefield.

But the number of units you can recruit is not unlimited. Once you reach the Command Point Limit (CPLimit) you cannot recruit more troops. 

CPLimit can be increased by building special buildings like farms, but the game doesn’t allow CPLimit to go higher than 1000 (which we will call CPMax) no matter how many farms you have.

So the goal is to do some reverse engineering in order to allow CPLimit to go beyond CPMax, which ought to make the game even more interesting.

Note: This can probably be done in 5 mins by modifying an option in some game file. But you don’t really learn much by doing so.

## 1- Finding CPLimit’s memory address

![BFME2 Screenshot](/img/1-Initial-CPL.webp)

At the start of the game, CPLimit=800.

To find the address of the variable in memory, we fire up Cheat Engine and attach it to the game’s process.

We enter 800 in the “Value” input box, and hit “First scan”:

![Cheat Engine: Searching for CPL's value in memory](/img/2-Initial-Mem-search.webp)

As we can see on the left, there are 846 variables containing that value.

To narrow the results, I will build a farm in the game which increases CPLimit’s value by 50.

I will then type the new value and hit “Next scan”:

![Cheat Engine: Finding CPL's value in memory](/img/3-Second-Mem-search.webp)

And there it is, CPLimit’s address is 04E39748 in Hexadecimal.

Now, if I were to quit the current game and launch a new one, the address would be different. That’s how the computer’s memory works.

I will try to change CPLimit’s value directly from Cheat Engine and set it to 1000:

![Cheat Engine: Attempting to change the value of CPL's memory location](/img/4-Mem-change.webp)

However, the game instantly sets it back to 850:

![Cheat Engine: CPL's value doesn't change](/img/5-Mem-unchanged.webp)

Well, this gives us an idea of how the game works. We can assume that it does not blindly trust the value in memory and that CPLimit is probably constantly recalculated.

## 2- Inspecting the game’s code

Now that we have our address, we can close Cheat Engine and open x32dbg, and attach it to the game’s process:

![](/img/6-Attaching-x32.webp)

Weirdly enough, there are 2 processes related to the game. I suppose that the first one is the actual game, while the second one is its launcher. Remember that.

So we choose the first process. And we are greeted with this scary-looking interface:

![](/img/6-x32dbg.png)

Here are the 3 important sections we need to know:

1.  This section contains the game’s code. As we can see, it is not in a high-level language such as C but in assembly, which is just a small step above binary.  
    The first column contains the instruction’s address, the second contains the instruction encoded in Hexadecimal, the third contains the instruction in assembly, and the fourth contains the instruction’s label.
2.  Here are the CPU registers and their current values. These values will of course keep changing during the program’s execution.
3.  Here is the memory’s content with their address in hexadecimal.

Now, as a starting point, we will look for our CPLimit variable in the memory section by

**Left-clicking > Go to > Expression** and enter the address we found earlier (04E39748):

![](/img/7-Hex-dump.png)

As a start, we will try to find the code that is responsible for modifying this variable whenever it is supposed to change.

I will left-click on it and **Breakpoint > Hardware > Write > DWORD.**

This will create a breakpoint on any instruction that modifies this address. Meaning that the program will execute normally, but when it reaches an instruction that writes something in this address, the execution will pause.

In the game, I will again build another farm to modify CPLimit, hence triggering our breakpoint. And indeed the game pauses here:

![](/img/8-Change-CPL.webp)

“**`mov dword ptr ds:[esi+10], edi`**” writes to our address. To understand why, we must understand this code.

The **`mov`** instruction has the following syntax: **`“mov destination, source”`**. And it moves the value from **`source`** to `**destination**`.

**`dword ptr ds:[X]`** refers to the memory location whose address is **`X`**. 

**`esi`** and **`edi`** are both CPU registers.

In short **“`mov dword ptr ds:[esi+10], edi`”** means “Move the value of the **`edi`** register to the memory location **`esi+10`**.

Okay, but what does it have to do with CPLimit?

If we take a look at the registers’ values:

![](/img/8-Change-CPL-Reg.png)

We notice that **`esi+10 = 04E39738 + 10 = 04E39748`** = CPLimit’s address.

And **`edi = 384`** which is the hexadecimal value of 900, the new value of CPLimit.

Using the debugger, we can now execute the program instruction by instruction.

We step out of the current function, and we find the instruction that called it:

![](/img/9-HandleCP.webp)

**`call <ADDRESS>`** is the instruction to call the function located at **`<ADDRESS>`**.

We suppose that this function handles something related to CPLimit. To confirm that, we set a breakpoint at the call instruction, and we let the program run freely.

The breakpoint is immediately triggered, which probably means that this function is called with every frame of the game.

We step inside the function. And instead of analyzing every instruction, we keep an eye on the registers’ values.

We keep stepping through the function’s code until we notice something here:

![](/img/9-CPL-loaded.webp)

After stepping over this other function, the register **`eax`** contains the value 900, which is the current value of CPLimit.

So there must be something important going on in this function, I set a breakpoint on it, and let the program run. And when it is triggered, I step into it:

![](/img/10-CPLimit-calculated.webp)

I notice that after executing **`add ebx, dword ptr ds:[esi+4]`**, ebx contains CPLimit, which is currently 900. 

But most interestingly, it did not just fetch its value from the memory address that we found earlier using Cheat Engine.

It was calculated from 2 other values located in memory at the addresses **`[esi+C]`** (C is 12 in hexadecimal) and **`[esi + 4]`**. 

Currently, **`[esi+C] = 150`** and **`[esi+4] = 750`**.

750 is the initial value of CPLimit when the player has no building.

150 is because my buildings have increased my CP limit by 150\. Both a citadel and a farm increase CPLimit by 50\. Since I have a Citadel and 2 farms, then CPLimit is increased by 50 + 50*2 = 150.

We keep stepping through the function until we reach this instruction:

![](/img/10-CPLimit-trimmer.webp)

**`cmovg ebx, esi`** means here: if **`ebx > esi`**, then put **`esi`**’s value into **`ebx`**.

By inspecting the values of the registers, we see that **`esi`** currently contains 1000 which is the value of CPMax.

This instruction makes sure that CPLimit cannot grow past that value, no matter how many farms we have. This is the culprit we have been looking for.

**`ebx`**’s value is later loaded into **`eax`**

In short, this is what this function does:

    def calculateCPLimit():
        CPLimit = BaseCP + AdditionalCP
        if CPLimit > CPmax:
            CPLimit = CPMax
            return CPLimit

(Yes, I know that Python uses snake_case)

Now, our objective is clear: remove that if statement. Which translates in assembly to removing that **`cmovg ebx, esi`** instruction.  
We can do that in x32dbg by **Left-clicking on it > DIsassembly,** and we replace the instruction with **`nop`**, an instruction that does nothing. We also check the “Fill with nops” option.

![Far](/img/11-Nopping-trimmer.webp)

We can see that it has been replaced with 3 nops, this is because the original instruction was 3 bytes long, while a nop is 1 byte.

Going back to the game, and after building 3 additional farms, we see the following result:

![](/img/12-Success.webp)

Yay!

However, our change is not persistent. If we close the game now, we would have to open x32dbg and modify the code again.

In the next article, we will solve that problem.

But for the moment, I am going to enjoy the game the way 10-year-old me dreamed of. Surely now I will beat the Brutal difficulty with this unfair advantage?

PS: I didn’t.
