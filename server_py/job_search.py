from serpapi import GoogleSearch
import os

api_key = os.environ.get("SERP_API")

def search_jobs(query, location, num_results=10):
    params = {
        "engine": "google_jobs",
        "q": query,
        "location": location,
        "num": num_results,
        "api_key": api_key
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    return results
