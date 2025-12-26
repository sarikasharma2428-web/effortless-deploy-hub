"""
Background Worker Service
Handles async tasks and job processing
"""

import asyncio
from datetime import datetime
from typing import Callable, Dict, Any
import logging

logger = logging.getLogger(__name__)

class BackgroundWorker:
    """Background worker for processing deployment jobs"""
    
    def __init__(self):
        self.running = False
        self.tasks: Dict[str, asyncio.Task] = {}
        self.job_queue: asyncio.Queue = None
    
    async def start(self):
        """Start the background worker"""
        self.running = True
        self.job_queue = asyncio.Queue()
        logger.info("Background worker started")
        
        # Start the main worker loop
        asyncio.create_task(self._process_jobs())
    
    async def stop(self):
        """Stop the background worker"""
        self.running = False
        
        # Cancel all running tasks
        for task_id, task in self.tasks.items():
            task.cancel()
            logger.info(f"Cancelled task: {task_id}")
        
        logger.info("Background worker stopped")
    
    async def submit_job(self, job_id: str, func: Callable, *args, **kwargs):
        """Submit a job to the queue"""
        job = {
            "id": job_id,
            "func": func,
            "args": args,
            "kwargs": kwargs,
            "submitted_at": datetime.utcnow().isoformat()
        }
        await self.job_queue.put(job)
        logger.info(f"Job submitted: {job_id}")
    
    async def _process_jobs(self):
        """Main job processing loop"""
        while self.running:
            try:
                job = await asyncio.wait_for(
                    self.job_queue.get(),
                    timeout=1.0
                )
                
                task = asyncio.create_task(
                    self._execute_job(job)
                )
                self.tasks[job["id"]] = task
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing job: {e}")
    
    async def _execute_job(self, job: Dict[str, Any]):
        """Execute a single job"""
        job_id = job["id"]
        try:
            logger.info(f"Executing job: {job_id}")
            result = await job["func"](*job["args"], **job["kwargs"])
            logger.info(f"Job completed: {job_id}")
            return result
        except Exception as e:
            logger.error(f"Job failed: {job_id} - {e}")
            raise
        finally:
            if job_id in self.tasks:
                del self.tasks[job_id]
    
    def get_status(self):
        """Get worker status"""
        return {
            "running": self.running,
            "active_tasks": len(self.tasks),
            "queue_size": self.job_queue.qsize() if self.job_queue else 0
        }
