using System;
using System.Runtime.InteropServices;

public class Program
{
    public const int KEYEVENTF_EXTENTEDKEY = 1;
    public const int KEYEVENTF_KEYUP = 0;
    public const int VK_MEDIA_NEXT_TRACK = 0xB0;
    public const int VK_MEDIA_PLAY_PAUSE = 0xB3;
    public const int VK_MEDIA_PREV_TRACK = 0xB1;

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, IntPtr extraInfo);

    public static void Main(string[] args)
    {
        string command = args[0];

        Console.Write(command);

        switch (command) {
            case "playpause":
                keybd_event(VK_MEDIA_PLAY_PAUSE, 0, KEYEVENTF_EXTENTEDKEY, IntPtr.Zero);
                break;
            
            case "prevtrack":
                keybd_event(VK_MEDIA_PREV_TRACK, 0, KEYEVENTF_EXTENTEDKEY, IntPtr.Zero);
                break;

            case "nexttrack":
                keybd_event(VK_MEDIA_NEXT_TRACK, 0, KEYEVENTF_EXTENTEDKEY, IntPtr.Zero);
                break;

            default:
                // unknown
                break;
        }
    }
}
