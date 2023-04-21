import os
import base64

secret_key = base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")
print(secret_key)
