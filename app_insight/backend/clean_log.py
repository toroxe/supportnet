import os

LOG_FILE = "./app_visits.log"
CLEANED_LOG_FILE = "./cleaned_app_visits.log"

def clean_log():
    """Tar bort oviktiga rader från loggfilen."""
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as log_file, \
             open(CLEANED_LOG_FILE, "w", encoding="utf-8") as cleaned_file:
            
            for line in log_file:
                # Lägg till filtreringslogik här
                if "Unknown" in line or "Internal traffic" in line:
                    continue  # Hoppa över oviktiga rader
                cleaned_file.write(line)
        
        print(f"Rensad logg sparad till: {CLEANED_LOG_FILE}")
    except Exception as e:
        print(f"Fel vid rensning av loggfil: {e}")

if __name__ == "__main__":
    clean_log()
 