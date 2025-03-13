import os
import time
import logging

class Logger:
    def __init__(self, name: str, see_time: bool = False, console_log: bool = False, level: int = logging.INFO):
        os.makedirs("./logs", exist_ok=True)
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        if see_time:
            formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        else:
            formatter = logging.Formatter("%(message)s,")
        file_handler = logging.FileHandler(f"./logs/{name}.log")
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        if console_log:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
    
    def log_message(self, message: str, level: int = logging.INFO):
        if level == logging.INFO:
            self.logger.info(message)
        elif level == logging.ERROR:
            self.logger.error(message)
        elif level == logging.WARNING:
            self.logger.warning(message)
        elif level == logging.DEBUG:
            self.logger.debug(message)
        else:
            self.logger.info(message)

    def disable_logging(self):
        # Disable all logging to avoid IO overhead, for production
        self.logger.disabled = True

def log_time(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        logger = Logger(func.__name__ + "_time", see_time=True, level=logging.INFO)
        logger.log_message(f"Function: {func.__name__}, Execution time: {round(execution_time, 5)} seconds")
        return result
    return wrapper