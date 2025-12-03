from passlib.context import CryptContext
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _hash_password_pre(password: str) -> str:
    # Pre-hash with SHA-256 to allow passwords > 72 bytes
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    # Note: This assumes all new passwords are pre-hashed. 
    # If backward compatibility is needed for non-pre-hashed passwords, 
    # we would need a way to distinguish them or try both.
    return pwd_context.verify(_hash_password_pre(plain_password), hashed_password)

def get_password_hash(password):
    return pwd_context.hash(_hash_password_pre(password))
