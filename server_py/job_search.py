from serpapi import GoogleSearch
import os
from dotenv import load_dotenv

load_dotenv()
print(os.environ)

api_key = os.environ.get("SERP_API")

print(api_key)

def call_serp_api(query, location, num_results=50):
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
