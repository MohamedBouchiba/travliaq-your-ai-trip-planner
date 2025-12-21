import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Edit, Trash2, Eye, Save, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  view_count: number;
};

const AdminBlog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      fetchPosts();
    }
  }, [user, isAdmin]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
    } else {
      setPosts(data || []);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setCurrentPost({
      ...currentPost,
      title,
      slug: currentPost.slug || generateSlug(title),
    });
  };

  const handleSave = async () => {
    if (!currentPost.title || !currentPost.content || !currentPost.slug) {
      toast({
        title: "Erreur",
        description: "Titre, slug et contenu sont requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const postData = {
      title: currentPost.title!,
      slug: currentPost.slug!,
      content: currentPost.content!,
      excerpt: currentPost.excerpt || null,
      cover_image: currentPost.cover_image || null,
      author_id: user?.id!,
      published: currentPost.published || false,
      published_at: currentPost.published ? new Date().toISOString() : null,
    };

    let error;
    if (currentPost.id) {
      const { error: updateError } = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", currentPost.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("blog_posts")
        .insert([postData]);
      error = insertError;
    }

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Article enregistré avec succès",
      });
      setIsEditing(false);
      setCurrentPost({});
      fetchPosts();
    }
  };

  const handleEdit = (post: BlogPost) => {
    setCurrentPost(post);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", postToDelete);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Article supprimé",
      });
      fetchPosts();
    }

    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };

  const handleNew = () => {
    setCurrentPost({ published: false });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentPost({});
  };

  // Show loading while checking role
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-travliaq-deep-blue"></div>
      </div>
    );
  }

  // Login screen if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-travliaq-deep-blue">
              Administration du Blog
            </h1>
            <p className="text-muted-foreground">
              Connectez-vous pour accéder au panneau d'administration
            </p>
          </div>

          <div className="py-8">
            <svg
              className="w-24 h-24 mx-auto text-travliaq-turquoise"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/admin/blog`,
                  queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                  },
                },
              });
              if (error) {
                toast({
                  title: "Erreur de connexion",
                  description: error.message,
                  variant: "destructive",
                });
              }
            }}
          >
            Se connecter avec Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  // Access denied if user is not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-travliaq-deep-blue">
              Accès Refusé
            </h1>
            <p className="text-muted-foreground">
              Vous n'avez pas l'autorisation d'accéder à cette page.
            </p>
          </div>

          <div className="py-8">
            <svg
              className="w-24 h-24 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold text-travliaq-deep-blue">
              {currentPost.id ? "Modifier l'article" : "Nouvel article"}
            </h1>
            <div className="w-24" />
          </div>

          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={currentPost.title || ""}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Titre de l'article"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <Input
                id="slug"
                value={currentPost.slug || ""}
                onChange={(e) =>
                  setCurrentPost({ ...currentPost, slug: e.target.value })
                }
                placeholder="url-de-larticle"
              />
              <p className="text-xs text-muted-foreground">
                L'URL sera: /blog/{currentPost.slug || "url-de-larticle"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Extrait</Label>
              <Textarea
                id="excerpt"
                value={currentPost.excerpt || ""}
                onChange={(e) =>
                  setCurrentPost({ ...currentPost, excerpt: e.target.value })
                }
                placeholder="Résumé court de l'article"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover_image">Image de couverture (URL)</Label>
              <Input
                id="cover_image"
                value={currentPost.cover_image || ""}
                onChange={(e) =>
                  setCurrentPost({ ...currentPost, cover_image: e.target.value })
                }
                placeholder="https://exemple.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu (Markdown)</Label>
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">Édition</TabsTrigger>
                  <TabsTrigger value="preview">Aperçu</TabsTrigger>
                </TabsList>
                <TabsContent value="edit">
                  <Textarea
                    id="content"
                    value={currentPost.content || ""}
                    onChange={(e) =>
                      setCurrentPost({ ...currentPost, content: e.target.value })
                    }
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Écrivez votre article en Markdown...&#10;&#10;# Titre principal&#10;## Sous-titre&#10;**Texte en gras**&#10;*Texte en italique*&#10;[Lien](https://example.com)&#10;![Image](url-image.jpg)"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[400px] p-6 border rounded-md bg-background prose prose-lg max-w-none prose-headings:text-travliaq-deep-blue prose-a:text-travliaq-turquoise prose-strong:text-travliaq-deep-blue">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {currentPost.content || "*Aucun contenu à prévisualiser*"}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={currentPost.published || false}
                onCheckedChange={(checked) =>
                  setCurrentPost({ ...currentPost, published: checked })
                }
              />
              <Label htmlFor="published">Publier l'article</Label>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-travliaq-deep-blue mb-2">
              Administration du Blog
            </h1>
            <p className="text-muted-foreground">
              Gérez vos articles de blog
            </p>
          </div>
          <Button onClick={handleNew} variant="hero">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel article
          </Button>
        </div>

        <div className="grid gap-4">
          {posts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Aucun article pour le moment
              </p>
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Créer le premier article
              </Button>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-travliaq-deep-blue">
                        {post.title}
                      </h3>
                      {post.published ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Publié
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          Brouillon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>/blog/{post.slug}</span>
                      <span>•</span>
                      <span>{post.view_count} vues</span>
                      <span>•</span>
                      <span>
                        Créé le{" "}
                        {new Date(post.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {post.published && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/blog/${post.slug}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setPostToDelete(post.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet article ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBlog;
