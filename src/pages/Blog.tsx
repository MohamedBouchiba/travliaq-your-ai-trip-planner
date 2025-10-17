import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Eye, ArrowRight, Search } from "lucide-react";
import Navigation from "@/components/Navigation";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  published_at: string;
  view_count: number;
};

const Blog = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    } else {
      setFilteredPosts(posts);
    }
  }, [searchQuery, posts]);

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image, published_at, view_count")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
      setFilteredPosts(data);
    }
    setIsLoading(false);
  };

  const handlePostClick = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-subtle">
        {/* Hero Section */}
        <section className="bg-gradient-hero text-white py-20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Carnets de Voyage
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
              Inspirations, conseils d'experts et récits authentiques pour préparer votre prochaine aventure
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="container max-w-6xl mx-auto px-4 py-8">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-lg"
          />
        </div>
      </section>

      {/* Posts Grid */}
      <section className="container max-w-6xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              {searchQuery
                ? "Aucun article trouvé pour votre recherche"
                : "Aucun article publié pour le moment"}
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <Card
                key={post.id}
                className="overflow-hidden hover:shadow-golden transition-all cursor-pointer group"
                onClick={() => handlePostClick(post.slug)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {post.cover_image ? (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-accent flex items-center justify-center">
                    <span className="text-6xl">📝</span>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-travliaq-deep-blue group-hover:text-travliaq-turquoise transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(post.published_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.view_count}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full group-hover:bg-travliaq-turquoise group-hover:text-white transition-all"
                  >
                    Lire l'article
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
};

export default Blog;
