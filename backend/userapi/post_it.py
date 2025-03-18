from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.db.database import get_db
from backend.db.models import PostIt, User

router = APIRouter()

class PostItSchema(BaseModel):
    user_id: int
    contract_id: int  # 🟢 Nu rätt!
    text: str
# ---------------------------------------------------------------------------
# Skapar en anteckning
# ----------------------------------------------------------------------------
@router.post("/postit")
def create_postit(postit: PostItSchema, db: Session = Depends(get_db)):
    #print("📌 POST mottagen med:", postit.dict())  # 🟢 Logga inkommande data

    if not postit.user_id or not postit.contract_id or not postit.text:
        raise HTTPException(status_code=400, detail="❌ Saknade fält!")

    new_post = PostIt(
        user_id=postit.user_id,
        contract_id=postit.contract_id,
        text=postit.text
    )
    db.add(new_post)
    db.commit()
    return {"message": "✅ Post-It skapad", "post_id": new_post.id}

# -------------------------------------------------------------------------------
# Hämtar alla anteckningar
# -------------------------------------------------------------------------------
@router.get("/postit")
def get_postits(db: Session = Depends(get_db)):
    posts = db.query(PostIt).join(User).all()
    return [{"id": p.id, "text": p.text, "c_name": p.user.c_name} for p in posts]

# ------------------------------------------------------------------------------
# Raderar en anteckning
# ------------------------------------------------------------------------------

@router.delete("/postit/{postit_id}")
def delete_postit(postit_id: int, db: Session = Depends(get_db)):
    post = db.query(PostIt).filter(PostIt.id == postit_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="❌ Post-It hittades inte!")

    db.delete(post)
    db.commit()
    return {"message": "✅ Post-It raderad!", "postit_id": postit_id}

