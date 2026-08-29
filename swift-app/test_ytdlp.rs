use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};

fn main() {
    let mut cmd = Command::new(r"C:\Users\anesx\AppData\Local\Programs\Python\Python314\Scripts\yt-dlp.exe");
    cmd.args(&[
        "--no-playlist",
        "--no-warnings",
        "--no-check-certificates",
        "--socket-timeout",
        "15",
        "--extractor-retries",
        "3",
        "--newline",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--referer",
        "https://www.youtube.com/watch?v=PKoHUDrcWAw",
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/bestvideo+bestaudio/best",
        "-o",
        r"C:\Users\anesx\Downloads\%(title)s.%(ext)s",
        "https://www.youtube.com/watch?v=PKoHUDrcWAw"
    ]);

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().unwrap();

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            println!("STDOUT: {}", line.unwrap());
        }
    }

    let status = child.wait().unwrap();
    println!("STATUS: {}", status);
}
