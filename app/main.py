from fastapi import FastAPI

app = FastAPI(title='SIEM Forense')


@app.get('/health')
def health():
    return {'estado': 'ok'}
