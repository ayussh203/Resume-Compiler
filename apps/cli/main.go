package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
)

type CompileRequest struct {
	Resume json.RawMessage `json:"resume"`
	JD     any            `json:"jd"`
	Prefs  map[string]any `json:"prefs,omitempty"`
}

func main() {
	var resumePath string
	var jdURL string
	var jdTextPath string
	var apiBase string

	flag.StringVar(&resumePath, "resume", "", "Path to resume JSON (required)")
	flag.StringVar(&jdURL, "jd", "", "Job description URL")
	flag.StringVar(&jdTextPath, "jdText", "", "Path to file containing JD text")
	flag.StringVar(&apiBase, "api", "http://localhost:3001", "API base URL")
	flag.Parse()

	if resumePath == "" {
		fmt.Println("Error: --resume is required")
		os.Exit(1)
	}
	if jdURL == "" && jdTextPath == "" {
		fmt.Println("Error: either --jd (URL) or --jdText (file) is required")
		os.Exit(1)
	}
	if jdURL != "" && jdTextPath != "" {
		fmt.Println("Error: provide only one of --jd or --jdText")
		os.Exit(1)
	}

	resumeBytes, err := os.ReadFile(resumePath)
	if err != nil {
		fmt.Printf("Error reading resume: %v\n", err)
		os.Exit(1)
	}

	// Quick JSON sanity
	var tmp any
	if err := json.Unmarshal(resumeBytes, &tmp); err != nil {
		fmt.Printf("Error: resume file is not valid JSON: %v\n", err)
		os.Exit(1)
	}

	var jd any
	if jdURL != "" {
		jd = map[string]any{"type": "url", "url": jdURL}
	} else {
		jdTextBytes, err := os.ReadFile(jdTextPath)
		if err != nil {
			fmt.Printf("Error reading jdText file: %v\n", err)
			os.Exit(1)
		}
		jd = map[string]any{"type": "text", "text": string(jdTextBytes)}
	}

	reqBody := CompileRequest{
		Resume: json.RawMessage(resumeBytes),
		JD:     jd,
		Prefs:  map[string]any{"template": "one_page_v1", "scoringModel": "keyword_alignment_v1"},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	resp, err := http.Post(apiBase+"/jobs", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		fmt.Printf("Error calling API: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		fmt.Printf("API error (%d):\n%s\n", resp.StatusCode, string(respBytes))
		os.Exit(1)
	}

	fmt.Println(string(respBytes))
}
