import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Eye, ArrowLeft, Clock } from "lucide-react";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import Navigation from "@/components/Navigation";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  published_at: string;
  view_count: number;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const fetchPost = async (slug: string) => {
    setIsLoading(true);

    // Fetch the post
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !data) {
      navigate("/blog");
      return;
    }

    setPost(data);

    // Increment view count
    await supabase
      .from("blog_posts")
      .update({ view_count: data.view_count + 1 })
      .eq("id", data.id);

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-subtle">
          <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded w-32" />
            <div className="h-12 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="aspect-video bg-muted rounded" />
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  if (!post) {
    return null;
  }

  const readingTime = post ? calculateReadingTime(post.content) : 0;
  const currentUrl = window.location.href;

  return (
    <>
      <Navigation />
      <ReadingProgress />
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <Button
            variant="outline"
            onClick={() => navigate("/blog")}
            className="mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('blog.backToBlog')}
          </Button>

          <div className="grid lg:grid-cols-[1fr_300px] gap-8">
            {/* Main Content */}
            <article className="animate-fade-up">
              <header className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-travliaq-deep-blue mb-6 leading-tight">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>
                      {new Date(post.published_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{t('blog.readingTime', { time: readingTime })}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    <span>{t('blog.views', { count: post.view_count })}</span>
                  </div>
                  <div className="ml-auto">
                    <ShareButtons title={post.title} url={currentUrl} />
                  </div>
                </div>

                {post.excerpt && (
                  <p className="text-xl text-muted-foreground italic leading-relaxed border-l-4 border-travliaq-turquoise pl-6 py-2">
                    {post.excerpt}
                  </p>
                )}
              </header>

              {post.cover_image && (
                <div className="mb-12 rounded-2xl overflow-hidden shadow-deep">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              <Card className="p-8 md:p-12 mb-8">
                <MarkdownContent content={post.content} />
              </Card>

              <div className="flex items-center justify-between py-6 border-t border-border">
                <ShareButtons title={post.title} url={currentUrl} />
                <Button
                  variant="outline"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  {t('common.backToTop')}
                </Button>
              </div>

              <RelatedPosts currentPostId={post.id} />
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <TableOfContents content={post.content} />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPost;
