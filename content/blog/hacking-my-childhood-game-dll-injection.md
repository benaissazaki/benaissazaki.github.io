---
title: "Hacking my childhood game: DLL Injection"
date: 2023-04-26T12:00:00Z
emoji: "💉"
description: Using DLL injection to change the behavior of Battle for Middle-Earth II
---

[Previously](/blog/hacking-my-childhood-game/), we analyzed The Lord of the Rings: Battle for Middle-Earth II’s code to find a way to allow the Command Point Limit to go beyond 1000\. We found that we could achieve that by changing the instruction at the address 0x006A74B9 from:

    cmovg ebx, esi

to

    nop
    nop
    nop

Doing that in x32dbg would only work until the game is closed. So now the goal is to make a more persistent solution using a DLL injection.

## What is a DLL?

Dynamic Link Libraries are libraries whose functions are loaded by a program when it needs them. Unlike a static library that is loaded before the program starts.

## The objective

Using C, we will make a DLL that will modify the game’s instruction at the address 0x006A74B9\. We will also make a program that launches the game and injects the DLL into its process.

## 1- Making the DLL

**Note:** I will be using the GCC compiler.

We start by creating the InjectedDLL.cpp file.

The first thing we need is to include the windows.h library to use the Windows API.

    #include <windows.h>

Second, we will define the entry point of our DLL. Unlike a normal C++ program, we won’t create a main() function but DllMain

    BOOL APIENTRY DllMain( HMODULE hModule,DWORD fdwReason, LPVOID lpReserved)
    {
        // Function body
    }

*   hModule is a handle for the DLL module.
*   fdwReason is the reason why DllMain is called, it can have the following values: DLL_PROCESS_ATTACH, DLL_PROCESS_DETACH, DLL_THREAD_ATTACH, DLL_THREAD_DETACH.

It is important to note that during the execution of the game, this function will likely be called multiple times. However, we want to modify the game’s code only when the DLL is first attached to the game process. This is when fdwReason comes in:

    BOOL APIENTRY DllMain( HMODULE hModule,DWORD fdwReason, LPVOID lpReserved)
    {
        // Change the game's code only when the DLL is first attached to the process
        if(fdwReason == DLL_PROCESS_ATTACH)
        {
            // Modify the game's code
        }
    }

Now we need to ask Windows for writing access on the address we want to modify. We can do that with the VirtualProtect function:

    BOOL APIENTRY DllMain( HMODULE hModule,DWORD fdwReason, LPVOID lpReserved)
    {
        if(fdwReason == DLL_PROCESS_ATTACH)
        {                
            unsigned char* CPLimiterAddress = (char*)0x006A74B9;        
            DWORD oldProtection;

            // Request read and write permissions on that address range
            BOOL isProtectSuccessful = VirtualProtect((void *)CPLimiterAddress, 3, PAGE_READWRITE, &oldProtection);

            if (!isProtectSuccessful)
                {
                    MessageBox(0, 0, 0, 0);
                    return FALSE;
                }
        }
    }

1.  The first argument is a pointer to the starting address of the region of memory whose protection attributes are being changed.
2.  The second is the size of the memory region in bytes. We chose 3 since the original instruction is 3 bytes long.
3.  The third is the new memory protection attribute for the selected memory region. We want to be able to read and write in it.
4.  The fourth one is a pointer to a variable that receives the old memory protection attributes of the region.

Finally, we will replace the original instruction with nops. We can’t write it directly as nop, so we will instead write its hexadecimal value which is 0x90.

    BOOL APIENTRY DllMain(HMODULE hModule, DWORD fdwReason, LPVOID lpReserved)
    {
        // Change the game's code only when the DLL is first attached to the process
        if (fdwReason == DLL_PROCESS_ATTACH)
        {
            unsigned char* CPLimiterAddress = (char*)0x006A74B9;

            DWORD oldProtection;
            // Request read and write permissions on that address range
            BOOL isProtectSuccessful = VirtualProtect((void *)CPLimiterAddress, 3, PAGE_READWRITE, &oldProtection);

            if (!isProtectSuccessful)
            {
                MessageBox(0, 0, 0, 0);
                return FALSE;
            }

            /* Replace with nops */
            *(CPLimiterAddress) = 0x90;
            *(CPLimiterAddress + 1) = 0x90;
            *(CPLimiterAddress + 2) = 0x90;

            return TRUE;
        }
    }

And here it is! Our DLL is ready, we can compile it with the gcc command:

    gcc -shared -o InjectedDLL.dll InjectedDLL.cpp

## 2- Injecting the DLL into our game

Now that our DLL is ready, we have to inject it into our game’s process. There are multiple ways to do it, but we will settle for making a custom launcher.

The custom launcher will start the game and attach our DLL to it.

The code is pretty straightforward, so here it is:

### The main function:

    int main()
    {
        const char *gamePath = "<PATH_TO_THE_GAME>\\lotrbfme2.exe";
        const char *dllPath = "<PATH_TO_THE_DLL>\\InjectedDLL.dll";

        if(!launchGame(gamePath))
        {
            printf("Failed to launch game: %d\n", GetLastError());
            return 1;
        }

        // Wait 10s for the game to start
        Sleep(10000);

        HANDLE gameHandle = getProcessHandleFromWindowName("The Lord of the Rings(tm), The Battle for Middle-earth(tm) II");
        if (gameHandle == NULL)
        {
            printf("Failed to get game handle: %d\n", GetLastError());
            return 1;
        }

        if(!loadDLLIntoProcess(gameHandle, dllPath))
        {
            printf("Failed to load DLL into the process: %d\n", GetLastError());
            return 1;
        }

        return 0;
    }

### launchGame function:

    BOOL launchGame(const char* gamePath)
    {
        PROCESS_INFORMATION pi = {0};
        STARTUPINFO si = {0};

        BOOL isProcessCreationSuccessful = CreateProcessA(gamePath, NULL, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi);

        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);   

        return isProcessCreationSuccessful;                    
    }

### getProcessHandleFromWindowName function:

    HANDLE getProcessHandleFromWindowName(const char *windowName)
    {
        /* Get a handle on the game's window */
        HWND hwnd = FindWindowA(NULL, windowName);

        if (hwnd == NULL)
        {
            printf("Could not find window: %d\n", GetLastError());
            return NULL;
        }

        /* Get the game's process Id using its window */
        DWORD processId;
        GetWindowThreadProcessId(hwnd, &processId);

        /* Get a handle on the game's process using its Id */
        HANDLE gameProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, processId);

        if (gameProcess == NULL)
        {
            printf("Could not open process: %d\n", GetLastError());
            return NULL;
        }

        return gameProcess;
    }

Why did we get the game’s handle using its window instead of the PROCESS_INFORMATION structure we got from CreateProcessA?

In the previous article, we noticed that there were actually two processes related to the game: the launcher and the actual game. If we used the PROCESS_INFORMATION structure, we would have a handle for the launcher, not the game.

### loadDLLIntoProcess

    BOOL loadDLLIntoProcess(const HANDLE gameProcess, const char *dllPath)
    {
        /* Allocate space in the process' memory for the dll's path */
        LPVOID dllPathAddress = VirtualAllocEx(gameProcess, NULL, strlen(dllPath) + 1, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);

        if (dllPathAddress == NULL)
        {
            printf("Could not allocate memory for the dll's path: %d\n", GetLastError());
            return FALSE;
        }

        /* Write the DLL's path in the allocated space */
        if (WriteProcessMemory(gameProcess, dllPathAddress, dllPath, strlen(dllPath) + 1, NULL) == 0)
        {
            printf("Could not write dll's path in allocated memory: %d\n", GetLastError());
            return FALSE;
        }

        /* Get a handle on kernel32.dll */
        HINSTANCE kernel32dll = GetModuleHandleA("kernel32.dll");

        if (kernel32dll == NULL)
        {
            printf("Could not get handle on kernel32: %d\n", GetLastError());
            return FALSE;
        }

        /* Get the address of kernel32's LoadLibraryA function */
        LPVOID loadLibraryAddress = (LPVOID)GetProcAddress(kernel32dll, "LoadLibraryA");

        if (loadLibraryAddress == NULL)
        {
            printf("Could not get find the address of LoadLibraryA: %d\n", GetLastError());
            return FALSE;
        }

        /* Use LoadLibraryA to load our DLL from dllPathAddress */
        HANDLE rThread = CreateRemoteThread(gameProcess, NULL, 0, (LPTHREAD_START_ROUTINE)loadLibraryAddress, dllPathAddress, 0, NULL);

        if (rThread == NULL)
        {
            printf("Could not create remote thread: %d\n", GetLastError());
            return FALSE;
        }

        /* Wait for the thread to finish */
        WaitForSingleObject(rThread, INFINITE);

        CloseHandle(rThread);
        VirtualFreeEx(gameProcess, dllPathAddress, strlen(dllPath) + 1, MEM_RELEASE);

        return TRUE;
    }

We combine them into a single file Launcher.c (or you can put the non-main functions into a separate header file):

    #include <windows.h>
    #include <stdio.h>

    BOOL launchGame(const char* gamePath);
    BOOL loadDLLIntoProcess(const HANDLE hProcess, const char *dllPath);
    HANDLE getProcessHandleFromWindowName(const char *windowName);

    int main()
    {...}

    BOOL launchGame(const char* gamePath)
    {...}

    HANDLE getProcessHandleFromWindowName(const char *windowName)
    {...}

    BOOL loadDLLIntoProcess(const HANDLE gameProcess, const char *dllPath)
    {...}

And we are done! We compile it using the following command:

    gcc -o Launcher.exe Launcher.c

Your antivirus might flag the compiled Launcher.exe file as dangerous. This is because DLL Injection is a technique commonly used by malware. But since our DLL doesn’t do anything malicious, you can safely ignore that.

Now if we open our launcher, the game will start and the Command Point limit will be able to grow above 1000.

![Final Result](/img/Final%20Result.webp)
