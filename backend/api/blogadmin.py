from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.db.database import get_db
from backend.db.models import BlogPost
import os
import uuid

router = APIRouter()

class BlogPostSchema(BaseModel):
    id: int
    title: str
    content: str
    likes: int
    contact_link: str
    is_advertisement: bool
    image_url: Optional[str] = None
    contract_name: Optional[str] = None

    class Config:
        from_attributes = True

# Hämtar alla blogginlägg
@router.get("/blogposts", response_model=list[BlogPostSchema])
def get_blogposts(db: Session = Depends(get_db)):
    posts = db.query(BlogPost).all()
    return posts

# Skapa nytt blogginlägg
@router.post("/blogposts", response_model=BlogPostSchema)
async def create_blogpost(
    title: str = Form(...),
    content: str = Form(...),
    likes: int = Form(0),
    contact_link: str = Form(...),
    is_advertisement: bool = Form(False),
    company_name: str = Form(None),  # Valfritt kontraktsnamn
    image: UploadFile = None,
    db: Session = Depends(get_db),
):
    # Validering av ingångsdata
    if not title or not content:
        raise HTTPException(status_code=400, detail="Titel och innehåll är obligatoriska fält.")

    file_url = None
    if image:
        # Validera och spara bilden
        file_extension = os.path.splitext(image.filename)[-1].lower()
        if file_extension not in [".jpg", ".jpeg", ".png", ".gif"]:
            raise HTTPException(status_code=400, detail="Ogiltigt filformat")
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("frontend/blog_pics", unique_filename)
        file_url = f"/blog_pics/{unique_filename}"
        with open(file_path, "wb") as file:
            file.write(await image.read())

    # Skapa och spara det nya blogginlägget
    new_post = BlogPost(
        title=title,
        content=content,
        likes=likes,
        contact_link=contact_link,
        is_advertisement=is_advertisement,
        company_name=company_name,
        image_url=file_url,
    )
    try:
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        return new_post
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ett fel uppstod: {e}")

# Uppdatera blogginlägg
@router.put("/blogposts/{post_id}", response_model=BlogPostSchema)
async def update_blogpost(
    post_id: int,
    title: str = Form(...),
    content: str = Form(...),
    likes: int = Form(0),
    contact_link: str = Form(...),
    is_advertisement: bool = Form(False),
    contract_name: str = Form(None),  # Lägg till kontraktsnamn
    image: UploadFile = None,
    db: Session = Depends(get_db),
):
    # Leta efter det befintliga inlägget
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blogginlägg hittades inte")

    try:
        # Uppdatera eller ersätt befintlig bild
        if image:
            file_extension = os.path.splitext(image.filename)[-1].lower()
            if file_extension not in [".jpg", ".jpeg", ".png", ".gif"]:
                raise HTTPException(status_code=400, detail="Ogiltigt filformat")

            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join("frontend/blog_pics", unique_filename)
            file_url = f"/blog_pics/{unique_filename}"

            # Radera gammal bild om den finns
            if post.image_url and os.path.exists(os.path.join("frontend/blog_pics", os.path.basename(post.image_url))):
                os.remove(os.path.join("frontend/blog_pics", os.path.basename(post.image_url)))

            # Spara ny bild
            with open(file_path, "wb") as file:
                file.write(await image.read())
            post.image_url = file_url

        # Uppdatera fält i den befintliga posten
        post.title = title
        post.content = content
        post.likes = likes
        post.contact_link = contact_link
        post.is_advertisement = is_advertisement
        post.contract_name = contract_name  # Uppdatera kontraktsnamnet

        db.commit()
        db.refresh(post)
        return post
    except Exception as e:
        db.rollback()  # Rollback vid fel
        raise HTTPException(status_code=500, detail=f"Ett fel uppstod: {e}")

# Radera ett blogginlägg
@router.delete("/blogposts/{post_id}")
def delete_blogpost(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blogginlägg hittades inte")
    
    if post.image_url:
        image_path = os.path.join("frontend/blog_pics", os.path.basename(post.image_url))
        if os.path.exists(image_path):
            os.remove(image_path)
    
    db.delete(post)
    db.commit()
    return {"message": "Blogginlägg och tillhörande bild har raderats"}

# ------------------------------------------------------------------------
# Räknar likes ;-)
# ------------------------------------------------------------------------
@router.post("/blogposts/{post_id}/like", response_model=BlogPostSchema)
async def like_blog_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blogginlägg hittades inte")

    try:
        post.likes += 1
        db.commit()
        db.refresh(post)
        return post
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
